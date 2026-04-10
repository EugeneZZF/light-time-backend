import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/prisma';
import { buildCategoryTree } from '../../common/category-tree';
import { CatalogProductsQueryDto } from './dto/catalog-products-query.dto';

@Injectable()
export class CatalogService {
  private readonly catalogBrandSelect = {
    id: true,
    name: true,
    slug: true,
    imageUrl: true,
    description: true,
  } as const;

  private async buildProductCategories(categoryId: number) {
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
      const category = await prisma.category.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          description: true,
          parentId: true,
        },
      });

      if (!category) {
        break;
      }

      chain.unshift(category);
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

  private async formatCatalogProduct(product: {
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
    brand: { id: number; name: string; slug: string } | null;
  }) {
    const categories = await this.buildProductCategories(product.categoryId);
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
        characteristics.luminous !== undefined && characteristics.luminous !== null
          ? Number(characteristics.luminous)
          : null,
      size:
        characteristics.size !== undefined && characteristics.size !== null
          ? String(characteristics.size)
          : null,
      baseType:
        characteristics.baseType !== undefined && characteristics.baseType !== null
          ? String(characteristics.baseType)
          : null,
      protectionDegree:
        characteristics.protectionDegree !== undefined && characteristics.protectionDegree !== null
          ? String(characteristics.protectionDegree)
          : null,
      materials:
        characteristics.materials !== undefined && characteristics.materials !== null
          ? String(characteristics.materials)
          : null,
      lightSourceType:
        characteristics.lightSourceType !== undefined && characteristics.lightSourceType !== null
          ? String(characteristics.lightSourceType)
          : null,
      reflectorType:
        characteristics.reflectorType !== undefined && characteristics.reflectorType !== null
          ? String(characteristics.reflectorType)
          : null,
      packaging:
        characteristics.packaging !== undefined && characteristics.packaging !== null
          ? String(characteristics.packaging)
          : null,
      quantity:
        characteristics.quantity !== undefined && characteristics.quantity !== null
          ? Number(characteristics.quantity)
          : null,
    };

    return {
      id: String(product.id),
      sku: product.sku,
      slug: product.slug,
      title: product.name,
      price: product.oldPrice ? String(product.oldPrice) : String(product.price),
      inStock: product.stockQty > 0,
      description: product.description,
      img: product.images.map((image) => ({
        url: image.url,
        sortOrder: image.sortOrder,
      })),
      specifications,
      discount: {
        hasDiscount: product.oldPrice !== null,
        new_price: product.oldPrice ? String(product.price) : null,
      },
      categories,
      brand: product.brand,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  getCategories() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        parentId: true,
        createdAt: true,
      },
    });
  }

  getLatestCategories(limit = 10) {
    const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 10;

    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: Math.min(Math.max(normalizedLimit, 1), 50),
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        parentId: true,
        createdAt: true,
      },
    });
  }

  async getCategoryTree() {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
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

  getBrands() {
    return prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: this.catalogBrandSelect,
    });
  }

  async getBrandBySlug(slug: string) {
    const brand = await prisma.brand.findFirst({
      where: { slug, isActive: true },
      select: this.catalogBrandSelect,
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  async getProducts(query: CatalogProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.discountedOnly) {
      where.oldPrice = { not: null };
    }

    if (query.categorySlug) {
      where.category = {
        slug: query.categorySlug,
      };
    }

    if (query.brandSlug) {
      const brand = await prisma.brand.findUnique({
        where: { slug: query.brandSlug },
        select: { id: true },
      });
      if (!brand) {
        return { items: [], page, limit, total: 0, totalPages: 0 };
      }
      where.brandId = brand.id;
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          images: { select: { id: true, url: true, sortOrder: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: await Promise.all(items.map((item) => this.formatCatalogProduct(item))),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async getProductBySlug(slug: string) {
    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, sortOrder: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatCatalogProduct(product);
  }

  async getLatestProduct() {
    const product = await prisma.product.findFirst({
      where: { isActive: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, sortOrder: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatCatalogProduct(product);
  }

  async getLatestProducts(limit = 10) {
    const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 10;

    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: Math.min(Math.max(normalizedLimit, 1), 50),
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, sortOrder: true } },
      },
    });

    return Promise.all(products.map((product) => this.formatCatalogProduct(product)));
  }

  async getDiscountedProducts() {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        oldPrice: { not: null },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, sortOrder: true } },
      },
    });

    return Promise.all(products.map((product) => this.formatCatalogProduct(product)));
  }
}
