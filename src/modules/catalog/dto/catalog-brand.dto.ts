import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CatalogBrandDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Nordic Aluminium' })
  name!: string;

  @ApiProperty({ example: 'nordic-aluminium' })
  slug!: string;

  @ApiPropertyOptional({ example: '/uploads/brand-nordic.webp', nullable: true })
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Brand description', nullable: true })
  description?: string | null;
}
