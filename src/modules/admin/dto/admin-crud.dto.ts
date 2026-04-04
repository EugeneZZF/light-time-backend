import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OrderStatus, PublishStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PRODUCT_TYPE_OPTIONS } from '../../../common/product-types';

const toOptionalNumber = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().replace(',', '.');

    if (normalizedValue === '') {
      return undefined;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : value;
  }

  return value;
};

export class AdminProductImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/products/1/main.jpg' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class AdminProductDiscountDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hasDiscount!: boolean;

  @ApiPropertyOptional({ example: '9990.00', nullable: true })
  @IsOptional()
  @IsString()
  new_price?: string | null;
}

export class AdminProductCategoryRefDto {
  @ApiProperty({ example: 'Трековые системы' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  id!: number;
}

export class AdminProductCategoriesDto {
  @ApiPropertyOptional({ type: AdminProductCategoryRefDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminProductCategoryRefDto)
  main?: AdminProductCategoryRefDto | null;

  @ApiPropertyOptional({ type: AdminProductCategoryRefDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminProductCategoryRefDto)
  subA?: AdminProductCategoryRefDto | null;

  @ApiPropertyOptional({ type: AdminProductCategoryRefDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminProductCategoryRefDto)
  subB?: AdminProductCategoryRefDto | null;
}

export class AdminProductBrandRefDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  id!: number;

  @ApiProperty({ example: 'Nordic Aluminium' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'nordic-aluminium', nullable: true })
  @IsOptional()
  @IsString()
  slug?: string | null;

  @ApiPropertyOptional({ example: '/uploads/brand-nordic.webp', nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Brand description', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class AdminProductSpecificationsDto {
  @ApiPropertyOptional({
    example: 'Wall-ceiling luminaires',
    enum: PRODUCT_TYPE_OPTIONS,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  type?: string | null;

  @ApiPropertyOptional({ example: 12, nullable: true })
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  power?: number | null;

  @ApiPropertyOptional({ example: 960, nullable: true })
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  luminous?: number | null;

  @ApiPropertyOptional({ example: '1200x35x55', nullable: true })
  @IsOptional()
  @IsString()
  size?: string | null;

  @ApiPropertyOptional({ example: 'GU10', nullable: true })
  @IsOptional()
  @IsString()
  baseType?: string | null;

  @ApiPropertyOptional({ example: 'IP65', nullable: true })
  @IsOptional()
  @IsString()
  protectionDegree?: string | null;

  @ApiPropertyOptional({ example: 'Aluminum, polycarbonate', nullable: true })
  @IsOptional()
  @IsString()
  materials?: string | null;

  @ApiPropertyOptional({ example: 'LED', nullable: true })
  @IsOptional()
  @IsString()
  lightSourceType?: string | null;

  @ApiPropertyOptional({ example: 'Opal diffuser', nullable: true })
  @IsOptional()
  @IsString()
  reflectorType?: string | null;

  @ApiPropertyOptional({ example: '1 pc / box', nullable: true })
  @IsOptional()
  @IsString()
  packaging?: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  quantity?: number | null;
}

export class CreateAdminProductDto {
  @ApiProperty({ example: 'Трековый светильник Sigma 12W' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '12990.00' })
  @IsString()
  price!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  inStock!: boolean;

  @ApiPropertyOptional({ example: 'Описание товара', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ type: [AdminProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductImageDto)
  img?: AdminProductImageDto[];

  @ApiPropertyOptional({
    type: AdminProductSpecificationsDto,
    example: {
      type: 'Wall-ceiling luminaires',
      power: 12,
      luminous: 960,
      size: '1200x35x55',
      baseType: 'GU10',
      protectionDegree: 'IP65',
      materials: 'Aluminum, polycarbonate',
      lightSourceType: 'LED',
      reflectorType: 'Opal diffuser',
      packaging: '1 pc / box',
      quantity: 1,
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AdminProductSpecificationsDto)
  specifications?: AdminProductSpecificationsDto;

  @ApiPropertyOptional({ type: AdminProductDiscountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminProductDiscountDto)
  discount?: AdminProductDiscountDto;

  @ApiProperty({ type: AdminProductCategoriesDto })
  @ValidateNested()
  @Type(() => AdminProductCategoriesDto)
  categories!: AdminProductCategoriesDto;

  @ApiPropertyOptional({
    type: AdminProductBrandRefDto,
    nullable: true,
    example: {
      id: 1,
      name: 'Nordic Aluminium',
      slug: 'nordic-aluminium',
      imageUrl: '/uploads/brand-nordic.webp',
      description: 'Brand description',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminProductBrandRefDto)
  brand?: AdminProductBrandRefDto | null;

  @ApiPropertyOptional({ example: 'track-svetilnik-sigma-12w' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAdminProductDto extends PartialType(CreateAdminProductDto) {}

export class ImportAdminProductDto {
  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value),
  )
  @IsString()
  id?: string;

  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  sku!: string;

  @ApiProperty({ example: 'track-svetilnik-sigma-12w' })
  @IsString()
  slug!: string;

  @ApiProperty({ example: 'Трековый светильник Sigma 12W' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '12990.00' })
  @IsString()
  price!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  inStock!: boolean;

  @ApiPropertyOptional({ example: 'Описание товара', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ type: AdminProductBrandRefDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminProductBrandRefDto)
  brand?: AdminProductBrandRefDto | null;

  @ApiPropertyOptional({ type: [AdminProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductImageDto)
  img?: AdminProductImageDto[];

  @ApiPropertyOptional({ type: AdminProductSpecificationsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AdminProductSpecificationsDto)
  specifications?: AdminProductSpecificationsDto;

  @ApiPropertyOptional({ type: AdminProductDiscountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminProductDiscountDto)
  discount?: AdminProductDiscountDto;

  @ApiProperty({ type: AdminProductCategoriesDto })
  @ValidateNested()
  @Type(() => AdminProductCategoriesDto)
  categories!: AdminProductCategoriesDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: '2026-04-04T12:00:00.000Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiPropertyOptional({
    example: '2026-04-04T12:00:00.000Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}

export class CreateAdminCategoryDto {
  @ApiProperty({ example: 'РўСЂРµРєРѕРІС‹Рµ СЃРёСЃС‚РµРјС‹' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'track-systems' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({
    example: '/uploads/e1ab6d3f-d18b-4fb2-a5b9-0472b1c31a88.png',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Категория для трековых систем', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAdminCategoryDto extends PartialType(CreateAdminCategoryDto) {}

export class ImportAdminCategoryNodeDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({ example: 'Внутреннее освещение' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'vnutrennee-osveschenie' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({
    example: '/uploads/vnutrennee-osveschenie.jpg',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Описание категории', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ type: () => [ImportAdminCategoryNodeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportAdminCategoryNodeDto)
  subcategoriesA?: ImportAdminCategoryNodeDto[];

  @ApiPropertyOptional({ type: () => [ImportAdminCategoryNodeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportAdminCategoryNodeDto)
  subcategoriesB?: ImportAdminCategoryNodeDto[];
}

export class ImportAdminCategoriesBatchDto {
  @ApiProperty({ type: [ImportAdminCategoryNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportAdminCategoryNodeDto)
  categories!: ImportAdminCategoryNodeDto[];
}

export class CreateAdminBrandDto {
  @ApiProperty({ example: 'Nordic Aluminium' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'nordic-aluminium' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({
    example: '/uploads/brand-nordic.webp',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 'РћРїРёСЃР°РЅРёРµ Р±СЂРµРЅРґР°', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateAdminBrandDto extends PartialType(CreateAdminBrandDto) {}

export class UpdateAdminOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.IN_WORK })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ example: 'РРІР°РЅ РРІР°РЅРѕРІ' })
  @IsOptional()
  @IsString()
  customer?: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'ivan@example.com', nullable: true })
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiPropertyOptional({ example: 'РљРѕРјРјРµРЅС‚Р°СЂРёР№', nullable: true })
  @IsOptional()
  @IsString()
  comment?: string | null;
}

export class UpdateAdminLeadDto {
  @ApiPropertyOptional({ example: 'РРІР°РЅ' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'project-page', nullable: true })
  @IsOptional()
  @IsString()
  source?: string | null;

  @ApiPropertyOptional({ example: 'new' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'РџРµСЂРµР·РІРѕРЅРёС‚СЊ РІРµС‡РµСЂРѕРј', nullable: true })
  @IsOptional()
  @IsString()
  comment?: string | null;
}

export class CreateAdminNewsDto {
  @ApiProperty({ example: 'new-warehouse-opening' })
  @IsString()
  slug!: string;

  @ApiProperty({ example: 'РћС‚РєСЂС‹С‚РёРµ РЅРѕРІРѕРіРѕ СЃРєР»Р°РґР°' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'РўРµРєСЃС‚ РЅРѕРІРѕСЃС‚Рё...' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ enum: PublishStatus, example: PublishStatus.PUBLISHED })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @ApiPropertyOptional({ example: '2026-03-10T00:00:00.000Z', nullable: true })
  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}

export class UpdateAdminNewsDto extends PartialType(CreateAdminNewsDto) {}

export class CreateAdminArticleDto extends CreateAdminNewsDto {}

export class UpdateAdminArticleDto extends PartialType(CreateAdminArticleDto) {}

export class ProjectImageInputDto {
  @ApiProperty({ example: 'https://cdn.example.com/projects/p1/1.jpg' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class ProjectEquipmentInputDto {
  @ApiProperty({ example: 'Nordic Aluminium SKB 12-3' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'РЎРєРѕР±Р° РєСЂРµРїР»РµРЅРёСЏ', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/equipment/e1.jpg', nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/products/e1', nullable: true })
  @IsOptional()
  @IsString()
  productUrl?: string | null;

  @ApiPropertyOptional({ example: 149.19, nullable: true })
  @IsOptional()
  @IsNumber()
  price?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateAdminProjectDto {
  @ApiProperty({ example: 'ashan-schelkovo' })
  @IsString()
  slug!: string;

  @ApiProperty({ example: 'РћСЃРІРµС‰РµРЅРёРµ СЃСѓРїРµСЂРјР°СЂРєРµС‚Р° "РђРЁРђРќ РЎРёС‚Рё"' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Краткое описание проекта', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 'РџРѕР»РЅРѕРµ РѕРїРёСЃР°РЅРёРµ РїСЂРѕРµРєС‚Р°...' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ enum: PublishStatus, example: PublishStatus.PUBLISHED })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @ApiPropertyOptional({ example: '2026-03-10T00:00:00.000Z', nullable: true })
  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;

  @ApiPropertyOptional({ type: [ProjectImageInputDto] })
  @IsOptional()
  @IsArray()
  @Type(() => ProjectImageInputDto)
  images?: ProjectImageInputDto[];

  @ApiPropertyOptional({ type: [ProjectEquipmentInputDto] })
  @IsOptional()
  @IsArray()
  @Type(() => ProjectEquipmentInputDto)
  equipment?: ProjectEquipmentInputDto[];
}

export class UpdateAdminProjectDto extends PartialType(CreateAdminProjectDto) {}

export class CreateAdminPageDto {
  @ApiProperty({ example: 'about' })
  @IsString()
  slug!: string;

  @ApiProperty({ example: 'Рћ РєРѕРјРїР°РЅРёРё' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'РўРµРєСЃС‚ СЃС‚СЂР°РЅРёС†С‹...' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ enum: PublishStatus, example: PublishStatus.PUBLISHED })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;
}

export class UpdateAdminPageDto extends PartialType(CreateAdminPageDto) {}
