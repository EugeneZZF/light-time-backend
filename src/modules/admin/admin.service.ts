import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, Prisma, PublishStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { prisma } from '../../../prisma/prisma';
import {
  buildStoredFileMeta,
  buildUploadUrl,
  findStoredFilenameById,
  StoredUploadFile,
} from './admin-files';
import { buildCategoryTree } from '../../common/category-tree';
import { PRODUCT_TYPE_OPTIONS } from '../../common/product-types';
import {
  AdminLoginDto,
  CreateAdminBootstrapDto,
} from './auth/dto/admin-login.dto';
import { AdminJwtUser } from './auth/admin-jwt.strategy';

type ImportJob = {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  createdAt: string;
};

type ImportedCategoryNodeInput = {
  id?: number;
  name?: string;
  slug?: string;
  imageUrl?: string | null;
  description?: string | null;
  parentId?: number | null;
  isActive?: boolean;
  sortOrder?: number;
  subcategoriesA?: ImportedCategoryNodeInput[];
  subcategoriesB?: ImportedCategoryNodeInput[];
};

type ImportedCategoryRecord = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
};

type ProductCategoryPayload = {
  main: {
    id: number;
    name: string;
    slug: string;
    imageUrl: string | null;
    description: string | null;
  } | null;
  subA: {
    id: number;
    name: string;
    slug: string;
    imageUrl: string | null;
    description: string | null;
  } | null;
  subB: {
    id: number;
    name: string;
    slug: string;
    imageUrl: string | null;
    description: string | null;
  } | null;
};

type ProductBrandPayload = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
} | null;

@Injectable()
export class AdminService {
  private readonly importJobs = new Map<string, ImportJob>();
  constructor(private readonly jwtService: JwtService) {}

  private async upsertImportedCategoryNode(
    input: ImportedCategoryNodeInput,
    parentId: number | null,
  ): Promise<ImportedCategoryRecord> {
    if (!input.name?.trim()) {
      throw new BadRequestException('Category name is required');
    }

    if (!input.slug?.trim()) {
      throw new BadRequestException('Category slug is required');
    }

    const data = {
      name: input.name.trim(),
      slug: input.slug.trim(),
      imageUrl: input.imageUrl ?? null,
      description: input.description ?? null,
      parentId,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    };

    if (input.id !== undefined) {
      const existingById = await prisma.category.findUnique({
        where: { id: input.id },
        select: { id: true },
      });

      if (existingById) {
        await this.validateCategoryParent(parentId, existingById.id);

        return prisma.category.update({
          where: { id: input.id },
          data,
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            description: true,
            parentId: true,
            sortOrder: true,
            isActive: true,
          },
        });
      }
    }

    const existingBySlug = await prisma.category.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });

    if (existingBySlug) {
      await this.validateCategoryParent(parentId, existingBySlug.id);

      return prisma.category.update({
        where: { id: existingBySlug.id },
        data,
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          description: true,
          parentId: true,
          sortOrder: true,
          isActive: true,
        },
      });
    }

    await this.validateCategoryParent(parentId);

    return prisma.category.create({
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        parentId: true,
        sortOrder: true,
        isActive: true,
      },
    });
  }

  private async getCategoryOrThrow(id: number) {
    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        isActive: true,
        sortOrder: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async getCategoryBySlugOrThrow(
    slug: string,
    displayName?: string,
  ) {
    const normalizedSlug = slug.trim();
    const category = await prisma.category.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        isActive: true,
        sortOrder: true,
      },
    });

    if (!category) {
      const details = [displayName?.trim(), normalizedSlug]
        .filter(Boolean)
        .join(' / ');
      throw new NotFoundException(
        details ? `Category not found: ${details}` : 'Category not found',
      );
    }

    return category;
  }

  private async getBrandOrThrow(id: number) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  private async getCategoryDepth(id: number) {
    let depth = 0;
    let current = await this.getCategoryOrThrow(id);

    while (current.parentId !== null) {
      depth += 1;
      current = await this.getCategoryOrThrow(current.parentId);
    }

    return depth;
  }

  private async validateCategoryParent(
    parentId: number | null | undefined,
    currentCategoryId?: number,
  ) {
    if (parentId === undefined || parentId === null) {
      return;
    }

    if (currentCategoryId !== undefined && parentId === currentCategoryId) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    const parentDepth = await this.getCategoryDepth(parentId);
    if (parentDepth >= 2) {
      throw new BadRequestException(
        'Only 3 category levels are allowed: root, subcategory A, subcategory B',
      );
    }

    if (currentCategoryId === undefined) {
      return;
    }

    let currentParentId: number | null = parentId;
    while (currentParentId !== null) {
      if (currentParentId === currentCategoryId) {
        throw new BadRequestException(
          'Category cannot be moved into its own subtree',
        );
      }

      const currentParent = await this.getCategoryOrThrow(currentParentId);
      currentParentId = currentParent.parentId;
    }
  }

  private async getCategorySubtreeIds(rootId: number) {
    const categories = await prisma.category.findMany({
      select: { id: true, parentId: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const target = categories.find((item) => item.id === rootId);
    if (!target) {
      throw new NotFoundException('Category not found');
    }

    const childrenByParent = new Map<number, number[]>();
    for (const category of categories) {
      if (category.parentId === null) {
        continue;
      }

      const siblings = childrenByParent.get(category.parentId) ?? [];
      siblings.push(category.id);
      childrenByParent.set(category.parentId, siblings);
    }

    const orderedIds: number[] = [];
    const visit = (categoryId: number) => {
      orderedIds.push(categoryId);
      for (const childId of childrenByParent.get(categoryId) ?? []) {
        visit(childId);
      }
    };

    visit(rootId);
    return orderedIds;
  }

  private toOrderStatus(value: unknown): OrderStatus | undefined {
    if (value === undefined) {
      return undefined;
    }
    const normalized = String(value) as OrderStatus;
    if (!Object.values(OrderStatus).includes(normalized)) {
      throw new BadRequestException('Invalid order status');
    }
    return normalized;
  }

  private toPublishStatus(value: unknown): PublishStatus | undefined {
    if (value === undefined) {
      return undefined;
    }
    const normalized = String(value) as PublishStatus;
    if (!Object.values(PublishStatus).includes(normalized)) {
      throw new BadRequestException('Invalid publish status');
    }
    return normalized;
  }

  private toProjectImages(
    value: unknown,
  ): Prisma.ProjectImageCreateWithoutProjectInput[] | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException('images must be an array');
    }

    return value.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new BadRequestException(`images[${index}] must be an object`);
      }
      const entry = item as Record<string, unknown>;
      if (!entry.url) {
        throw new BadRequestException(`images[${index}].url is required`);
      }
      const sortOrder =
        entry.sortOrder !== undefined ? Number(entry.sortOrder) : index;
      if (!Number.isFinite(sortOrder)) {
        throw new BadRequestException(
          `images[${index}].sortOrder must be a number`,
        );
      }

      return {
        url: String(entry.url),
        sortOrder,
      };
    });
  }

  private toProjectEquipment(
    value: unknown,
  ): Prisma.ProjectEquipmentCreateWithoutProjectInput[] | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException('equipment must be an array');
    }

    return value.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new BadRequestException(`equipment[${index}] must be an object`);
      }

      const entry = item as Record<string, unknown>;
      if (!entry.name) {
        throw new BadRequestException(`equipment[${index}].name is required`);
      }

      const sortOrder =
        entry.sortOrder !== undefined ? Number(entry.sortOrder) : index;
      if (!Number.isFinite(sortOrder)) {
        throw new BadRequestException(
          `equipment[${index}].sortOrder must be a number`,
        );
      }

      const price =
        entry.price !== undefined && entry.price !== null
          ? this.normalizeDecimalString(
              entry.price,
              `equipment[${index}].price`,
            )
          : undefined;

      return {
        name: String(entry.name),
        description:
          entry.description !== undefined
            ? entry.description === null
              ? null
              : String(entry.description)
            : undefined,
        imageUrl:
          entry.imageUrl !== undefined
            ? entry.imageUrl === null
              ? null
              : String(entry.imageUrl)
            : undefined,
        productUrl:
          entry.productUrl !== undefined
            ? entry.productUrl === null
              ? null
              : String(entry.productUrl)
            : undefined,
        price,
        sortOrder,
      };
    });
  }

  private slugifyProductValue(value: string) {
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return slug || 'product';
  }

  private normalizeDecimalString(value: unknown, fieldName: string): string {
    if (value === undefined || value === null) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new BadRequestException(`${fieldName} must be a number`);
      }
      return String(value);
    }

    const raw = String(value).trim();
    const compact = raw.replace(/[\s\u00A0]+/g, '');
    const normalized = compact.replace(',', '.');

    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
      throw new BadRequestException(`${fieldName} must be a valid decimal`);
    }

    return normalized;
  }

  private async generateUniqueProductSlug(title: string) {
    const baseSlug = this.slugifyProductValue(title);
    let candidate = baseSlug;
    let suffix = 2;

    while (
      await prisma.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async generateUniqueProductSku() {
    let candidate = '';

    do {
      candidate = `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    } while (
      await prisma.product.findUnique({
        where: { sku: candidate },
        select: { id: true },
      })
    );

    return candidate;
  }

  private toProductImages(
    value: unknown,
  ): Prisma.ProductImageCreateWithoutProductInput[] | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException('img must be an array');
    }

    return value.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new BadRequestException(`img[${index}] must be an object`);
      }

      const entry = item as Record<string, unknown>;
      if (!entry.url) {
        throw new BadRequestException(`img[${index}].url is required`);
      }

      const sortOrder =
        entry.sortOrder !== undefined ? Number(entry.sortOrder) : index;
      if (!Number.isFinite(sortOrder)) {
        throw new BadRequestException(
          `img[${index}].sortOrder must be a number`,
        );
      }

      return {
        url: String(entry.url),
        sortOrder,
      };
    });
  }

  private toProductCharacteristics(value: unknown) {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return Prisma.JsonNull;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(
        '\u0445\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a\u0438 must be an object',
      );
    }

    const specifications = value as Record<string, unknown>;
    const productType =
      specifications.type !== undefined
        ? specifications.type === null
          ? null
          : String(specifications.type)
        : null;

    if (
      productType !== null &&
      !PRODUCT_TYPE_OPTIONS.includes(
        productType as (typeof PRODUCT_TYPE_OPTIONS)[number],
      )
    ) {
      throw new BadRequestException(
        `specifications.type must be one of: ${PRODUCT_TYPE_OPTIONS.join(', ')}`,
      );
    }

    const power =
      specifications.power !== undefined && specifications.power !== null
        ? Number(specifications.power)
        : null;
    if (power !== null && !Number.isFinite(power)) {
      throw new BadRequestException('specifications.power must be a number');
    }

    const luminous =
      specifications.luminous !== undefined && specifications.luminous !== null
        ? Number(specifications.luminous)
        : null;
    if (luminous !== null && !Number.isFinite(luminous)) {
      throw new BadRequestException('specifications.luminous must be a number');
    }

    const quantity =
      specifications.quantity !== undefined && specifications.quantity !== null
        ? Number(specifications.quantity)
        : null;
    if (quantity !== null && !Number.isFinite(quantity)) {
      throw new BadRequestException('specifications.quantity must be a number');
    }

    return {
      type: productType,
      power,
      luminous,
      size:
        specifications.size !== undefined
          ? specifications.size === null
            ? null
            : String(specifications.size)
          : null,
      baseType:
        specifications.baseType !== undefined
          ? specifications.baseType === null
            ? null
            : String(specifications.baseType)
          : null,
      protectionDegree:
        specifications.protectionDegree !== undefined
          ? specifications.protectionDegree === null
            ? null
            : String(specifications.protectionDegree)
          : null,
      materials:
        specifications.materials !== undefined
          ? specifications.materials === null
            ? null
            : String(specifications.materials)
          : null,
      lightSourceType:
        specifications.lightSourceType !== undefined
          ? specifications.lightSourceType === null
            ? null
            : String(specifications.lightSourceType)
          : null,
      reflectorType:
        specifications.reflectorType !== undefined
          ? specifications.reflectorType === null
            ? null
            : String(specifications.reflectorType)
          : null,
      packaging:
        specifications.packaging !== undefined
          ? specifications.packaging === null
            ? null
            : String(specifications.packaging)
          : null,
      quantity,
    } satisfies Prisma.InputJsonValue;
  }

  private async resolveProductCategoryId(
    body: Record<string, unknown>,
    fallbackCategoryId?: number,
  ) {
    const categories =
      body.categories &&
      typeof body.categories === 'object' &&
      !Array.isArray(body.categories)
        ? (body.categories as Record<string, unknown>)
        : undefined;

    const refs = [categories?.subB, categories?.subA, categories?.main];
    for (const ref of refs) {
      if (!ref || typeof ref !== 'object' || Array.isArray(ref)) {
        continue;
      }

      const categoryRef = ref as Record<string, unknown>;
      const categoryName =
        typeof categoryRef.name === 'string' ? categoryRef.name : undefined;

      const slugValue = categoryRef.slug;
      if (typeof slugValue === 'string' && slugValue.trim()) {
        const category = await this.getCategoryBySlugOrThrow(
          slugValue,
          categoryName,
        );
        return category.id;
      }

      const idValue = categoryRef.id;
      if (idValue === undefined || idValue === null) {
        continue;
      }

      const categoryId = Number(idValue);
      if (!Number.isInteger(categoryId) || categoryId < 1) {
        throw new BadRequestException(
          'categories.*.slug must be a non-empty string or categories.*.id must be a positive integer',
        );
      }

      try {
        await this.getCategoryOrThrow(categoryId);
      } catch (error) {
        if (error instanceof NotFoundException) {
          const details = [categoryName?.trim(), String(categoryId)]
            .filter(Boolean)
            .join(' / ');
          throw new NotFoundException(
            details ? `Category not found: ${details}` : 'Category not found',
          );
        }
        throw error;
      }

      return categoryId;
    }

    if (body.categoryId !== undefined) {
      const categoryId = Number(body.categoryId);
      if (!Number.isInteger(categoryId) || categoryId < 1) {
        throw new BadRequestException('categoryId must be a positive integer');
      }
      await this.getCategoryOrThrow(categoryId);
      return categoryId;
    }

    if (fallbackCategoryId !== undefined) {
      return fallbackCategoryId;
    }

    throw new BadRequestException(
      'categories.main/subA/subB.slug or categories.main/subA/subB.id is required',
    );
  }

  private async resolveImportedProductCategoryId(
    body: Record<string, unknown>,
  ) {
    const categories =
      body.categories &&
      typeof body.categories === 'object' &&
      !Array.isArray(body.categories)
        ? (body.categories as Record<string, unknown>)
        : undefined;

    const refs = [categories?.subB, categories?.subA, categories?.main];
    for (const ref of refs) {
      if (!ref || typeof ref !== 'object' || Array.isArray(ref)) {
        continue;
      }

      const categoryRef = ref as Record<string, unknown>;
      const categoryName =
        typeof categoryRef.name === 'string' ? categoryRef.name : undefined;
      const slugValue =
        typeof categoryRef.slug === 'string' && categoryRef.slug.trim()
          ? categoryRef.slug
          : typeof categoryRef.name === 'string' && categoryRef.name.trim()
            ? categoryRef.name
            : undefined;

      if (!slugValue) {
        continue;
      }

      const category = await this.getCategoryBySlugOrThrow(
        slugValue,
        categoryName,
      );
      return category.id;
    }

    throw new BadRequestException(
      'Imported products require categories.main/subA/subB.slug',
    );
  }

  private async buildProductCategories(
    categoryId: number,
  ): Promise<ProductCategoryPayload> {
    const chain: Array<{
      id: number;
      name: string;
      slug: string;
      imageUrl: string | null;
      description: string | null;
      parentId: number | null;
    }> = [];
    let currentId: number | null = categoryId;

    while (currentId !== null) {
      const category = await this.getCategoryOrThrow(currentId);
      chain.unshift({
        id: category.id,
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
        description: category.description,
        parentId: category.parentId,
      });
      currentId = category.parentId;
    }

    return {
      main: chain[0]
        ? {
            id: chain[0].id,
            name: chain[0].name,
            slug: chain[0].slug,
            imageUrl: chain[0].imageUrl,
            description: chain[0].description,
          }
        : null,
      subA: chain[1]
        ? {
            id: chain[1].id,
            name: chain[1].name,
            slug: chain[1].slug,
            imageUrl: chain[1].imageUrl,
            description: chain[1].description,
          }
        : null,
      subB: chain[2]
        ? {
            id: chain[2].id,
            name: chain[2].name,
            slug: chain[2].slug,
            imageUrl: chain[2].imageUrl,
            description: chain[2].description,
          }
        : null,
    };
  }

  private async resolveProductBrand(
    body: Record<string, unknown>,
    fallbackBrandId?: number | null,
  ): Promise<number | null | undefined> {
    const brand =
      body.brand && typeof body.brand === 'object' && !Array.isArray(body.brand)
        ? (body.brand as Record<string, unknown>)
        : undefined;

    if (brand !== undefined) {
      const idValue = brand.id;
      if (idValue === null) {
        return null;
      }
      if (idValue !== undefined) {
        const brandId = Number(idValue);
        if (!Number.isInteger(brandId) || brandId < 1) {
          throw new BadRequestException('brand.id must be a positive integer');
        }
        await this.getBrandOrThrow(brandId);
        return brandId;
      }
    }

    if (body.brandId !== undefined) {
      if (body.brandId === null) {
        return null;
      }

      const brandId = Number(body.brandId);
      if (!Number.isInteger(brandId) || brandId < 1) {
        throw new BadRequestException('brandId must be a positive integer');
      }
      await this.getBrandOrThrow(brandId);
      return brandId;
    }

    return fallbackBrandId;
  }

  private parseImportedNumericId(value: unknown, fieldName: string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return parsed;
  }

  private async upsertImportedBrand(
    brandInput: Record<string, unknown> | null | undefined,
  ): Promise<number | null> {
    if (brandInput === undefined) {
      return null;
    }

    if (brandInput === null) {
      return null;
    }

    const id = this.parseImportedNumericId(brandInput.id, 'brand.id');
    const name =
      brandInput.name !== undefined && brandInput.name !== null
        ? String(brandInput.name).trim()
        : '';
    const slug =
      brandInput.slug !== undefined && brandInput.slug !== null
        ? String(brandInput.slug).trim()
        : '';

    if (!name) {
      throw new BadRequestException('brand.name is required');
    }

    if (!slug) {
      throw new BadRequestException('brand.slug is required');
    }

    const data = {
      name,
      slug,
      imageUrl:
        brandInput.imageUrl !== undefined
          ? brandInput.imageUrl === null
            ? null
            : String(brandInput.imageUrl)
          : null,
      description:
        brandInput.description !== undefined
          ? brandInput.description === null
            ? null
            : String(brandInput.description)
          : null,
      isActive:
        brandInput.isActive !== undefined
          ? Boolean(brandInput.isActive)
          : true,
    };

    if (id !== undefined) {
      const existingById = await prisma.brand.findUnique({
        where: { id },
        select: { id: true },
      });

      if (existingById) {
        const updated = await prisma.brand.update({
          where: { id },
          data,
          select: { id: true },
        });
        return updated.id;
      }
    }

    const existingBySlug = await prisma.brand.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingBySlug) {
      const updated = await prisma.brand.update({
        where: { id: existingBySlug.id },
        data,
        select: { id: true },
      });
      return updated.id;
    }

    const created = await prisma.brand.create({
      data: {
        ...(id !== undefined ? { id } : {}),
        ...data,
      },
      select: { id: true },
    });

    return created.id;
  }

  private async formatAdminProduct(product: {
    id: number;
    sku: string;
    slug: string;
    name: string;
    description: string | null;
    characteristics: Prisma.JsonValue | null;
    price: Prisma.Decimal;
    oldPrice: Prisma.Decimal | null;
    stockQty: number;
    isActive: boolean;
    categoryId: number;
    brandId: number | null;
    createdAt: Date;
    updatedAt: Date;
    images: Array<{ id: number; url: string; sortOrder: number }>;
    brand?: {
      id: number;
      name: string;
      slug: string;
      imageUrl: string | null;
      description: string | null;
    } | null;
  }) {
    const categories = await this.buildProductCategories(product.categoryId);
    const brand: ProductBrandPayload =
      product.brandId !== null
        ? product.brand
          ? product.brand
          : await this.getBrandOrThrow(product.brandId)
        : null;
    const displayPrice = product.oldPrice
      ? String(product.oldPrice)
      : String(product.price);
    const discountedPrice = product.oldPrice ? String(product.price) : null;
    const characteristics =
      product.characteristics &&
      typeof product.characteristics === 'object' &&
      !Array.isArray(product.characteristics)
        ? (product.characteristics as Record<string, unknown>)
        : {};

    const specifications = {
      type:
        characteristics.type !== undefined && characteristics.type !== null
          ? String(characteristics.type)
          : null,
      power:
        characteristics.power !== undefined && characteristics.power !== null
          ? Number(characteristics.power)
          : null,
      luminous:
        characteristics.luminous !== undefined &&
        characteristics.luminous !== null
          ? Number(characteristics.luminous)
          : null,
      size:
        characteristics.size !== undefined && characteristics.size !== null
          ? String(characteristics.size)
          : null,
      baseType:
        characteristics.baseType !== undefined &&
        characteristics.baseType !== null
          ? String(characteristics.baseType)
          : null,
      protectionDegree:
        characteristics.protectionDegree !== undefined &&
        characteristics.protectionDegree !== null
          ? String(characteristics.protectionDegree)
          : null,
      materials:
        characteristics.materials !== undefined &&
        characteristics.materials !== null
          ? String(characteristics.materials)
          : null,
      lightSourceType:
        characteristics.lightSourceType !== undefined &&
        characteristics.lightSourceType !== null
          ? String(characteristics.lightSourceType)
          : null,
      reflectorType:
        characteristics.reflectorType !== undefined &&
        characteristics.reflectorType !== null
          ? String(characteristics.reflectorType)
          : null,
      packaging:
        characteristics.packaging !== undefined &&
        characteristics.packaging !== null
          ? String(characteristics.packaging)
          : null,
      quantity:
        characteristics.quantity !== undefined &&
        characteristics.quantity !== null
          ? Number(characteristics.quantity)
          : null,
    };

    return {
      id: String(product.id),
      sku: product.sku,
      slug: product.slug,
      title: product.name,
      price: displayPrice,
      inStock: product.stockQty > 0,
      description: product.description,
      img: product.images.map((image) => ({
        url: image.url,
        sortOrder: image.sortOrder,
      })),
      specifications,
      discount: {
        hasDiscount: product.oldPrice !== null,
        new_price: discountedPrice,
      },
      categories,
      brand,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private async getAdminProductEntityOrThrow(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            description: true,
          },
        },
        images: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true, url: true, sortOrder: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private throwIfForeignKeyConstraint(error: unknown, message: string): never {
    const e = error as { code?: string };
    if (e?.code === 'P2003') {
      throw new BadRequestException(message);
    }
    throw error;
  }

  async login(dto: AdminLoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: { select: { code: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const roles = user.roles.map((item) => item.role.code);
    if (!roles.includes('admin')) {
      throw new UnauthorizedException('Admin role is required');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      roles,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    };
  }

  async bootstrapAdmin(dto: CreateAdminBootstrapDto) {
    if (dto.secret !== 'admin-secret') {
      throw new UnauthorizedException('Invalid bootstrap secret');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const role = await tx.role.upsert({
        where: { code: 'admin' },
        update: {},
        create: {
          code: 'admin',
          name: 'Administrator',
        },
      });

      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName ?? null,
          isActive: true,
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: role.id,
        },
      });

      return createdUser;
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: ['admin'],
      },
    };
  }

  refresh(user: AdminJwtUser) {
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        roles: user.roles,
      }),
    };
  }

  logout() {
    return { success: true };
  }

  me(user: AdminJwtUser) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
    };
  }

  async getAdminProducts() {
    const products = await prisma.product.findMany({
      orderBy: { id: 'desc' },
      include: {
        images: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true, url: true, sortOrder: true },
        },
      },
    });

    return Promise.all(
      products.map((product) => this.formatAdminProduct(product)),
    );
  }

  async createAdminProduct(body: Record<string, unknown>) {
    const title =
      body.title !== undefined
        ? String(body.title)
        : body.name !== undefined
          ? String(body.name)
          : undefined;

    if (!title || body.price === undefined) {
      throw new BadRequestException('title and price are required');
    }

    const categoryId = await this.resolveProductCategoryId(body);
    const discount =
      body.discount &&
      typeof body.discount === 'object' &&
      !Array.isArray(body.discount)
        ? (body.discount as Record<string, unknown>)
        : undefined;
    const images = this.toProductImages(body.img ?? body.images);
    const basePrice = this.normalizeDecimalString(body.price, 'price');
    const hasDiscount = discount ? Boolean(discount.hasDiscount) : false;

    if (
      hasDiscount &&
      (discount?.new_price === undefined || discount.new_price === null)
    ) {
      throw new BadRequestException(
        'discount.new_price is required when hasDiscount=true',
      );
    }

    const created = await prisma.product.create({
      data: {
        sku:
          body.sku !== undefined &&
          body.sku !== null &&
          String(body.sku).trim() !== ''
            ? String(body.sku)
            : await this.generateUniqueProductSku(),
        slug:
          body.slug !== undefined &&
          body.slug !== null &&
          String(body.slug).trim() !== ''
            ? String(body.slug)
            : await this.generateUniqueProductSlug(title),
        name: title,
        description:
          body.description !== undefined
            ? body.description === null
              ? null
              : String(body.description)
            : null,
        characteristics: this.toProductCharacteristics(body.specifications),
        price: hasDiscount
          ? this.normalizeDecimalString(discount?.new_price, 'discount.new_price')
          : basePrice,
        oldPrice: hasDiscount ? basePrice : null,
        stockQty:
          body.inStock !== undefined
            ? Boolean(body.inStock)
              ? 1
              : 0
            : body.stockQty !== undefined
              ? Number(body.stockQty)
              : 0,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        isFeatured:
          body.isFeatured !== undefined ? Boolean(body.isFeatured) : false,
        isNew: body.isNew !== undefined ? Boolean(body.isNew) : false,
        categoryId,
        brandId: await this.resolveProductBrand(body, null),
        images: images !== undefined ? { create: images } : undefined,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            description: true,
          },
        },
        images: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true, url: true, sortOrder: true },
        },
      },
    });

    return this.formatAdminProduct(created);
  }

  async getAdminProductById(id: number) {
    const product = await this.getAdminProductEntityOrThrow(id);
    return this.formatAdminProduct(product);
  }

  async patchAdminProduct(id: number, body: Record<string, unknown>) {
    const existing = await this.getAdminProductEntityOrThrow(id);
    const discount =
      body.discount !== undefined &&
      body.discount !== null &&
      typeof body.discount === 'object' &&
      !Array.isArray(body.discount)
        ? (body.discount as Record<string, unknown>)
        : undefined;
    const images = this.toProductImages(body.img ?? body.images);

    let nextPrice =
      body.price !== undefined
        ? this.normalizeDecimalString(body.price, 'price')
        : String(existing.price);
    let nextOldPrice =
      body.oldPrice !== undefined
        ? body.oldPrice === null
          ? null
          : this.normalizeDecimalString(body.oldPrice, 'oldPrice')
        : existing.oldPrice !== null
          ? String(existing.oldPrice)
          : null;

    if (discount) {
      const hasDiscount = Boolean(discount.hasDiscount);
      if (hasDiscount) {
        if (discount.new_price === undefined || discount.new_price === null) {
          throw new BadRequestException(
            'discount.new_price is required when hasDiscount=true',
          );
        }
        nextOldPrice =
          body.price !== undefined
            ? this.normalizeDecimalString(body.price, 'price')
            : existing.oldPrice !== null
              ? String(existing.oldPrice)
              : String(existing.price);
        nextPrice = this.normalizeDecimalString(
          discount.new_price,
          'discount.new_price',
        );
      } else {
        nextOldPrice = null;
        if (body.price === undefined && existing.oldPrice !== null) {
          nextPrice = String(existing.oldPrice);
        }
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        sku: body.sku !== undefined ? String(body.sku) : undefined,
        slug: body.slug !== undefined ? String(body.slug) : undefined,
        name:
          body.title !== undefined
            ? String(body.title)
            : body.name !== undefined
              ? String(body.name)
              : undefined,
        description:
          body.description !== undefined
            ? body.description === null
              ? null
              : String(body.description)
            : undefined,
        characteristics: this.toProductCharacteristics(body.specifications),
        price: body.price !== undefined || discount ? nextPrice : undefined,
        oldPrice:
          body.oldPrice !== undefined || discount ? nextOldPrice : undefined,
        stockQty:
          body.inStock !== undefined
            ? Boolean(body.inStock)
              ? 1
              : 0
            : body.stockQty !== undefined
              ? Number(body.stockQty)
              : undefined,
        isActive:
          body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        isFeatured:
          body.isFeatured !== undefined ? Boolean(body.isFeatured) : undefined,
        isNew: body.isNew !== undefined ? Boolean(body.isNew) : undefined,
        categoryId:
          body.categories !== undefined || body.categoryId !== undefined
            ? await this.resolveProductCategoryId(body, existing.categoryId)
            : undefined,
        brandId: await this.resolveProductBrand(body, existing.brandId),
        images:
          images !== undefined
            ? {
                deleteMany: {},
                create: images,
              }
            : undefined,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            description: true,
          },
        },
        images: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true, url: true, sortOrder: true },
        },
      },
    });

    return this.formatAdminProduct(updated);
  }

  async deleteAdminProduct(id: number) {
    await this.getAdminProductEntityOrThrow(id);
    try {
      await prisma.product.delete({ where: { id } });
    } catch (error) {
      this.throwIfForeignKeyConstraint(
        error,
        'Product cannot be deleted because it is used in orders or cart items',
      );
    }
    return { success: true };
  }

  async importAdminProducts(items: Record<string, unknown>[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Body must be a non-empty array of products');
    }

    const importedProducts: Awaited<
      ReturnType<AdminService['formatAdminProduct']>
    >[] = [];

    for (const item of items) {
      const title =
        item.title !== undefined
          ? String(item.title).trim()
          : item.name !== undefined
            ? String(item.name).trim()
            : '';
      const slug =
        item.slug !== undefined && item.slug !== null
          ? String(item.slug).trim()
          : '';
      const sku =
        item.sku !== undefined && item.sku !== null
          ? String(item.sku).trim()
          : '';

      if (!title || !slug || !sku || item.price === undefined) {
        throw new BadRequestException(
          'Each product must include title, slug, sku and price',
        );
      }

      const categoryId = await this.resolveImportedProductCategoryId(item);
      const brand =
        item.brand !== undefined &&
        item.brand !== null &&
        typeof item.brand === 'object' &&
        !Array.isArray(item.brand)
          ? (item.brand as Record<string, unknown>)
          : item.brand === null
            ? null
            : undefined;
      const brandId =
        brand !== undefined
          ? await this.upsertImportedBrand(brand)
          : await this.resolveProductBrand(item, null);

      const discount =
        item.discount &&
        typeof item.discount === 'object' &&
        !Array.isArray(item.discount)
          ? (item.discount as Record<string, unknown>)
          : undefined;
      const images = this.toProductImages(item.img ?? item.images);
      const hasDiscount = discount ? Boolean(discount.hasDiscount) : false;
      const basePrice = this.normalizeDecimalString(item.price, 'price');

      if (
        hasDiscount &&
        (discount?.new_price === undefined || discount.new_price === null)
      ) {
        throw new BadRequestException(
          'discount.new_price is required when hasDiscount=true',
        );
      }

      const productData = {
        sku,
        slug,
        name: title,
        description:
          item.description !== undefined
            ? item.description === null
              ? null
              : String(item.description)
            : null,
        characteristics: this.toProductCharacteristics(item.specifications),
        price: hasDiscount
          ? this.normalizeDecimalString(discount?.new_price, 'discount.new_price')
          : basePrice,
        oldPrice: hasDiscount ? basePrice : null,
        stockQty: Boolean(item.inStock) ? 1 : 0,
        isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
        isFeatured:
          item.isFeatured !== undefined ? Boolean(item.isFeatured) : false,
        isNew: item.isNew !== undefined ? Boolean(item.isNew) : false,
        categoryId,
        brandId,
        createdAt:
          item.createdAt !== undefined && item.createdAt !== null
            ? new Date(String(item.createdAt))
            : undefined,
        updatedAt:
          item.updatedAt !== undefined && item.updatedAt !== null
            ? new Date(String(item.updatedAt))
            : undefined,
      };

      const importedId = this.parseImportedNumericId(item.id, 'id');

      let existingProduct:
        | {
            id: number;
            brandId: number | null;
          }
        | null = null;

      if (importedId !== undefined) {
        existingProduct = await prisma.product.findUnique({
          where: { id: importedId },
          select: { id: true, brandId: true },
        });
      }

      if (!existingProduct) {
        existingProduct = await prisma.product.findUnique({
          where: { slug },
          select: { id: true, brandId: true },
        });
      }

      if (!existingProduct) {
        existingProduct = await prisma.product.findUnique({
          where: { sku },
          select: { id: true, brandId: true },
        });
      }

      const saved = existingProduct
        ? await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              ...productData,
              images:
                images !== undefined
                  ? {
                      deleteMany: {},
                      create: images,
                    }
                  : undefined,
            },
            include: {
              brand: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  imageUrl: true,
                  description: true,
                },
              },
              images: {
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                select: { id: true, url: true, sortOrder: true },
              },
            },
          })
        : await prisma.product.create({
            data: {
              ...(importedId !== undefined ? { id: importedId } : {}),
              ...productData,
              images: images !== undefined ? { create: images } : undefined,
            },
            include: {
              brand: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  imageUrl: true,
                  description: true,
                },
              },
              images: {
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                select: { id: true, url: true, sortOrder: true },
              },
            },
          });

      importedProducts.push(await this.formatAdminProduct(saved));
    }

    return {
      success: true,
      count: importedProducts.length,
      products: importedProducts,
    };
  }

  getAdminCategories() {
    return prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async getAdminCategoryTree() {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        parentId: true,
        isActive: true,
        sortOrder: true,
      },
    });

    return buildCategoryTree(categories);
  }

  async createAdminCategory(body: Record<string, unknown>) {
    if (!body.name || !body.slug) {
      throw new BadRequestException('name and slug are required');
    }

    const parentId =
      body.parentId !== undefined && body.parentId !== null
        ? Number(body.parentId)
        : null;

    await this.validateCategoryParent(parentId);

    return prisma.category.create({
      data: {
        name: String(body.name),
        slug: String(body.slug),
        imageUrl:
          body.imageUrl !== undefined
            ? body.imageUrl === null
              ? null
              : String(body.imageUrl)
            : null,
        description:
          body.description !== undefined
            ? body.description === null
              ? null
              : String(body.description)
            : null,
        parentId,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });
  }

  createAdminSubcategory(parentId: number, body: Record<string, unknown>) {
    return this.createAdminCategory({
      ...body,
      parentId,
    });
  }

  async importAdminCategories(
    body:
      | ImportedCategoryNodeInput
      | ImportedCategoryNodeInput[]
      | (ImportedCategoryNodeInput & {
          categories?: ImportedCategoryNodeInput[];
        }),
  ) {
    const batchBody = !Array.isArray(body) ? ('categories' in body ? body : null) : null;
    const categoriesToImport = Array.isArray(body)
      ? body
      : Array.isArray(batchBody?.categories)
        ? batchBody.categories
        : [body];
    if (categoriesToImport.length === 0) {
      throw new BadRequestException(
        'categories must contain at least one item',
      );
    }

    const importNode = async (
      node: ImportedCategoryNodeInput,
      parentId: number | null,
      level: 0 | 1 | 2,
    ): Promise<any> => {
      if (level === 0 && (node.subcategoriesB?.length ?? 0) > 0) {
        throw new BadRequestException(
          'subcategoriesB is allowed only for subcategory A items',
        );
      }

      if (level === 1 && (node.subcategoriesA?.length ?? 0) > 0) {
        throw new BadRequestException(
          'subcategoriesA is allowed only for root categories',
        );
      }

      const saved = await this.upsertImportedCategoryNode(node, parentId);

      if (level === 0) {
        return {
          ...saved,
          subcategoriesA: await Promise.all(
            (node.subcategoriesA ?? []).map((child) =>
              importNode(child, saved.id, 1),
            ),
          ),
        };
      }

      if (level === 1) {
        return {
          ...saved,
          subcategoriesB: await Promise.all(
            (node.subcategoriesB ?? []).map((child) =>
              importNode(child, saved.id, 2),
            ),
          ),
        };
      }

      if ((node.subcategoriesA?.length ?? 0) > 0) {
        throw new BadRequestException(
          'subcategoriesA is allowed only for root categories',
        );
      }

      if ((node.subcategoriesB?.length ?? 0) > 0) {
        throw new BadRequestException(
          'subcategoriesB is allowed only for subcategory A items',
        );
      }

      return saved;
    };

    const importedCategories: any[] = [];
    for (const categoryInput of categoriesToImport) {
      importedCategories.push(await importNode(categoryInput, null, 0));
    }

    return {
      success: true,
      categories: importedCategories,
      count: importedCategories.length,
    };
  }

  async patchAdminCategory(id: number, body: Record<string, unknown>) {
    await this.getCategoryOrThrow(id);
    const nextParentId =
      body.parentId !== undefined
        ? body.parentId === null
          ? null
          : Number(body.parentId)
        : undefined;

    await this.validateCategoryParent(nextParentId, id);

    return prisma.category.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name) : undefined,
        slug: body.slug !== undefined ? String(body.slug) : undefined,
        imageUrl:
          body.imageUrl !== undefined
            ? body.imageUrl === null
              ? null
              : String(body.imageUrl)
            : undefined,
        description:
          body.description !== undefined
            ? body.description === null
              ? null
              : String(body.description)
            : undefined,
        parentId: nextParentId,
        sortOrder:
          body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        isActive:
          body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });
  }

  async deleteAdminCategory(id: number) {
    const subtreeIds = await this.getCategorySubtreeIds(id);
    const productsCount = await prisma.product.count({
      where: { categoryId: { in: subtreeIds } },
    });

    if (productsCount > 0) {
      throw new BadRequestException(
        'Category subtree cannot be deleted because it has linked products',
      );
    }

    try {
      await prisma.category.deleteMany({
        where: { id: { in: subtreeIds } },
      });
    } catch (error) {
      this.throwIfForeignKeyConstraint(
        error,
        'Category cannot be deleted because it has linked products or child categories',
      );
    }
    return { success: true };
  }

  getAdminBrands() {
    return prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  createAdminBrand(body: Record<string, unknown>) {
    if (!body.name || !body.slug) {
      throw new BadRequestException('name and slug are required');
    }
    return prisma.brand.create({
      data: {
        name: String(body.name),
        slug: String(body.slug),
        imageUrl:
          body.imageUrl !== undefined
            ? body.imageUrl === null
              ? null
              : String(body.imageUrl)
            : null,
        description: body.description ? String(body.description) : null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });
  }

  async patchAdminBrand(id: number, body: Record<string, unknown>) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return prisma.brand.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name) : undefined,
        slug: body.slug !== undefined ? String(body.slug) : undefined,
        imageUrl:
          body.imageUrl !== undefined
            ? body.imageUrl === null
              ? null
              : String(body.imageUrl)
            : undefined,
        description:
          body.description !== undefined
            ? body.description === null
              ? null
              : String(body.description)
            : undefined,
        isActive:
          body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });
  }

  async deleteAdminBrand(id: number) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    try {
      await prisma.brand.delete({ where: { id } });
    } catch (error) {
      this.throwIfForeignKeyConstraint(
        error,
        'Brand cannot be deleted because it has linked products',
      );
    }
    return { success: true };
  }

  getAdminOrders() {
    return prisma.order.findMany({
      orderBy: { id: 'desc' },
      include: { items: true },
    });
  }

  async getAdminOrderById(id: number) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async patchAdminOrder(id: number, body: Record<string, unknown>) {
    await this.getAdminOrderById(id);
    return prisma.order.update({
      where: { id },
      data: {
        status: this.toOrderStatus(body.status),
        customer:
          body.customer !== undefined ? String(body.customer) : undefined,
        phone: body.phone !== undefined ? String(body.phone) : undefined,
        email:
          body.email !== undefined
            ? body.email === null
              ? null
              : String(body.email)
            : undefined,
        comment:
          body.comment !== undefined
            ? body.comment === null
              ? null
              : String(body.comment)
            : undefined,
      },
    });
  }

  getAdminLeads() {
    return prisma.lead.findMany({ orderBy: { id: 'desc' } });
  }

  getAdminOrderCalculations() {
    return prisma.lead.findMany({
      where: { source: 'orderCalculation' },
      orderBy: { id: 'desc' },
    });
  }

  async patchAdminLead(id: number, body: Record<string, unknown>) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return prisma.lead.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name) : undefined,
        phone: body.phone !== undefined ? String(body.phone) : undefined,
        source:
          body.source !== undefined
            ? body.source === null
              ? null
              : String(body.source)
            : undefined,
        status: body.status !== undefined ? String(body.status) : undefined,
        comment:
          body.comment !== undefined
            ? body.comment === null
              ? null
              : String(body.comment)
            : undefined,
      },
    });
  }

  getAdminNews() {
    return prisma.news.findMany({ orderBy: { id: 'desc' } });
  }

  createAdminNews(body: Record<string, unknown>) {
    if (!body.slug || !body.title || !body.content) {
      throw new BadRequestException('slug, title, content are required');
    }

    return prisma.news.create({
      data: {
        slug: String(body.slug),
        title: String(body.title),
        content: String(body.content),
        status: this.toPublishStatus(body.status),
        publishedAt: body.publishedAt
          ? new Date(String(body.publishedAt))
          : null,
      },
    });
  }

  async patchAdminNews(id: number, body: Record<string, unknown>) {
    const entity = await prisma.news.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entity) {
      throw new NotFoundException('News not found');
    }

    return prisma.news.update({
      where: { id },
      data: {
        slug: body.slug !== undefined ? String(body.slug) : undefined,
        title: body.title !== undefined ? String(body.title) : undefined,
        content: body.content !== undefined ? String(body.content) : undefined,
        status: this.toPublishStatus(body.status),
        publishedAt:
          body.publishedAt !== undefined
            ? body.publishedAt === null
              ? null
              : new Date(String(body.publishedAt))
            : undefined,
      },
    });
  }

  async deleteAdminNews(id: number) {
    const entity = await prisma.news.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entity) {
      throw new NotFoundException('News not found');
    }
    await prisma.news.delete({ where: { id } });
    return { success: true };
  }

  getAdminArticles() {
    return prisma.article.findMany({ orderBy: { id: 'desc' } });
  }

  createAdminArticle(body: Record<string, unknown>) {
    if (!body.slug || !body.title || !body.content) {
      throw new BadRequestException('slug, title, content are required');
    }

    return prisma.article.create({
      data: {
        slug: String(body.slug),
        title: String(body.title),
        content: String(body.content),
        status: this.toPublishStatus(body.status),
        publishedAt: body.publishedAt
          ? new Date(String(body.publishedAt))
          : null,
      },
    });
  }

  async patchAdminArticle(id: number, body: Record<string, unknown>) {
    const entity = await prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entity) {
      throw new NotFoundException('Article not found');
    }

    return prisma.article.update({
      where: { id },
      data: {
        slug: body.slug !== undefined ? String(body.slug) : undefined,
        title: body.title !== undefined ? String(body.title) : undefined,
        content: body.content !== undefined ? String(body.content) : undefined,
        status: this.toPublishStatus(body.status),
        publishedAt:
          body.publishedAt !== undefined
            ? body.publishedAt === null
              ? null
              : new Date(String(body.publishedAt))
            : undefined,
      },
    });
  }

  async deleteAdminArticle(id: number) {
    const entity = await prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entity) {
      throw new NotFoundException('Article not found');
    }
    await prisma.article.delete({ where: { id } });
    return { success: true };
  }

  getAdminProjects() {
    return prisma.project.findMany({
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      include: {
        images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        equipment: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });
  }

  createAdminProject(body: Record<string, unknown>) {
    if (!body.slug || !body.title || !body.content) {
      throw new BadRequestException('slug, title, content are required');
    }

    const images = this.toProjectImages(body.images);
    const equipment = this.toProjectEquipment(body.equipment);

    return prisma.project.create({
      data: {
        slug: String(body.slug),
        title: String(body.title),
        description:
          body.description !== undefined
            ? body.description === null
              ? null
              : String(body.description)
            : null,
        content: String(body.content),
        status: this.toPublishStatus(body.status),
        publishedAt:
          body.publishedAt !== undefined
            ? body.publishedAt === null
              ? null
              : new Date(String(body.publishedAt))
            : null,
        images: images !== undefined ? { create: images } : undefined,
        equipment: equipment !== undefined ? { create: equipment } : undefined,
      },
      include: {
        images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        equipment: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });
  }

  async patchAdminProject(id: number, body: Record<string, unknown>) {
    const entity = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entity) {
      throw new NotFoundException('Project not found');
    }

    const images = this.toProjectImages(body.images);
    const equipment = this.toProjectEquipment(body.equipment);

    return prisma.project.update({
      where: { id },
      data: {
        slug: body.slug !== undefined ? String(body.slug) : undefined,
        title: body.title !== undefined ? String(body.title) : undefined,
        description:
          body.description !== undefined
            ? body.description === null
              ? null
              : String(body.description)
            : undefined,
        content: body.content !== undefined ? String(body.content) : undefined,
        status: this.toPublishStatus(body.status),
        publishedAt:
          body.publishedAt !== undefined
            ? body.publishedAt === null
              ? null
              : new Date(String(body.publishedAt))
            : undefined,
        images:
          images !== undefined
            ? {
                deleteMany: {},
                create: images,
              }
            : undefined,
        equipment:
          equipment !== undefined
            ? {
                deleteMany: {},
                create: equipment,
              }
            : undefined,
      },
      include: {
        images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        equipment: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });
  }

  async deleteAdminProject(id: number) {
    const entity = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entity) {
      throw new NotFoundException('Project not found');
    }
    await prisma.project.delete({ where: { id } });
    return { success: true };
  }

  getAdminPages() {
    return prisma.page.findMany({ orderBy: { id: 'desc' } });
  }

  createAdminPage(body: Record<string, unknown>) {
    if (!body.slug || !body.title || !body.content) {
      throw new BadRequestException('slug, title, content are required');
    }
    return prisma.page.create({
      data: {
        slug: String(body.slug),
        title: String(body.title),
        content: String(body.content),
        status: this.toPublishStatus(body.status),
      },
    });
  }

  async patchAdminPage(id: number, body: Record<string, unknown>) {
    const entity = await prisma.page.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entity) {
      throw new NotFoundException('Page not found');
    }
    return prisma.page.update({
      where: { id },
      data: {
        slug: body.slug !== undefined ? String(body.slug) : undefined,
        title: body.title !== undefined ? String(body.title) : undefined,
        content: body.content !== undefined ? String(body.content) : undefined,
        status: this.toPublishStatus(body.status),
      },
    });
  }

  async deleteAdminPage(id: number) {
    const entity = await prisma.page.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entity) {
      throw new NotFoundException('Page not found');
    }
    await prisma.page.delete({ where: { id } });
    return { success: true };
  }

  uploadFile(file: StoredUploadFile) {
    const dotIndex = file.filename.indexOf('.');
    const id =
      dotIndex === -1 ? file.filename : file.filename.slice(0, dotIndex);

    return {
      id,
      url: buildUploadUrl(file.filename),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  getFileById(id: string) {
    const storedFilename = findStoredFilenameById(id);
    if (!storedFilename) {
      throw new NotFoundException('File not found');
    }

    return buildStoredFileMeta(storedFilename);
  }

  getFileMetaById(id: string) {
    const { path, ...fileMeta } = this.getFileById(id);
    return fileMeta;
  }

  async deleteFile(id: string) {
    const file = this.getFileById(id);

    await unlink(file.path);

    return {
      success: true,
      deletedFileId: id,
    };
  }

  startImportPrice() {
    const id = `job-${Date.now()}`;
    const job: ImportJob = {
      id,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    this.importJobs.set(id, job);
    return job;
  }

  getImportJob(id: string) {
    const job = this.importJobs.get(id);
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return job;
  }

  getAuditLogs() {
    return prisma.auditLog.findMany({
      orderBy: { id: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
  }
}
