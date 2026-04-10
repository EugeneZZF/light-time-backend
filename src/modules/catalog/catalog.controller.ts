import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CatalogBrandDto } from './dto/catalog-brand.dto';
import { CatalogProductsQueryDto } from './dto/catalog-products-query.dto';

@ApiTags('Catalog')
@Controller('api/catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get active categories' })
  getCategories() {
    return this.catalogService.getCategories();
  }

  @Get('categories/latest')
  @ApiOperation({ summary: 'Get latest active categories' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of categories to return' })
  getLatestCategories(@Query('limit') limit?: string) {
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;
    return this.catalogService.getLatestCategories(parsedLimit);
  }

  @Get('categories/tree')
  @ApiOperation({ summary: 'Get active categories tree: root -> subcategory A -> subcategory B' })
  getCategoryTree() {
    return this.catalogService.getCategoryTree();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get active brands' })
  @ApiOkResponse({ type: CatalogBrandDto, isArray: true })
  getBrands() {
    return this.catalogService.getBrands();
  }

  @Get('brands/:slug')
  @ApiOperation({ summary: 'Get active brand by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Brand slug' })
  @ApiOkResponse({ type: CatalogBrandDto })
  getBrandBySlug(@Param('slug') slug: string) {
    return this.catalogService.getBrandBySlug(slug);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get catalog products with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'categorySlug', required: false, type: String, description: 'Category slug' })
  @ApiQuery({ name: 'brandSlug', required: false, type: String, description: 'Brand slug' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'discountedOnly', required: false, type: Boolean, description: 'Return only discounted products' })
  getProducts(@Query() query: CatalogProductsQueryDto) {
    return this.catalogService.getProducts(query);
  }

  @Get('product/lastest')
  @ApiOperation({ summary: 'Get latest product' })
  getLatestProduct() {
    return this.catalogService.getLatestProduct();
  }

  @Get('products/latest')
  @ApiOperation({ summary: 'Get latest products' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of products to return' })
  getLatestProducts(@Query('limit') limit?: string) {
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;
    return this.catalogService.getLatestProducts(parsedLimit);
  }

  @Get('products/discounted')
  @ApiOperation({ summary: 'Get all discounted products' })
  getDiscountedProducts() {
    return this.catalogService.getDiscountedProducts();
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Product slug' })
  getProductBySlug(@Param('slug') slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }
}
