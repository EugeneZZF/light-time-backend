import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFilePipeBuilder } from '@nestjs/common';
import type { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { AdminService } from './admin.service';
import { Public } from './auth/public.decorator';
import {
  AdminLoginDto,
  CreateAdminBootstrapDto,
} from './auth/dto/admin-login.dto';
import { AdminJwtAuthGuard } from './auth/admin-jwt-auth.guard';
import { AdminJwtUser } from './auth/admin-jwt.strategy';
import {
  buildStoredFilename,
  ensureUploadsDir,
  UPLOADS_DIR,
} from './admin-files';
import type { StoredUploadFile } from './admin-files';
import {
  CreateAdminArticleDto,
  CreateAdminBrandDto,
  CreateAdminCategoryDto,
  ImportAdminCategoryNodeDto,
  ImportAdminCategoriesBatchDto,
  ImportAdminProductDto,
  CreateAdminNewsDto,
  CreateAdminPageDto,
  CreateAdminProductDto,
  CreateAdminProjectDto,
  UpdateAdminArticleDto,
  UpdateAdminBrandDto,
  UpdateAdminCategoryDto,
  UpdateAdminLeadDto,
  UpdateAdminNewsDto,
  UpdateAdminOrderDto,
  UpdateAdminPageDto,
  UpdateAdminProductDto,
  UpdateAdminProjectDto,
} from './dto/admin-crud.dto';
import {
  AdminFileMetaResponseDto,
  AdminUploadFileBodyDto,
  AdminUploadFileResponseDto,
} from './dto/admin-files.dto';

const ADMIN_SWAGGER_TAGS = {
  auth: 'Admin Auth',
  products: 'Admin Products',
  categories: 'Admin Categories',
  brands: 'Admin Brands',
  orders: 'Admin Orders',
  leads: 'Admin Leads',
  news: 'Admin News',
  articles: 'Admin Articles',
  projects: 'Admin Projects',
  pages: 'Admin Pages',
  files: 'Admin Files',
  imports: 'Admin Imports',
  auditLogs: 'Admin Audit Logs',
} as const;

@ApiBearerAuth()
@Controller('api/admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Post('auth/login')
  @ApiTags(ADMIN_SWAGGER_TAGS.auth)
  @ApiOperation({ summary: 'Admin login (public)' })
  login(@Body() body: AdminLoginDto) {
    return this.adminService.login(body);
  }

  @Public()
  @Post('auth/bootstrap')
  @ApiTags(ADMIN_SWAGGER_TAGS.auth)
  @ApiOperation({ summary: 'Create admin user (temporary public endpoint)' })
  bootstrapAdmin(@Body() body: CreateAdminBootstrapDto) {
    return this.adminService.bootstrapAdmin(body);
  }

  @Post('auth/refresh')
  @ApiTags(ADMIN_SWAGGER_TAGS.auth)
  @ApiOperation({ summary: 'Refresh admin access token' })
  refresh(@Req() req: Request & { user: AdminJwtUser }) {
    return this.adminService.refresh(req.user);
  }

  @Post('auth/logout')
  @ApiTags(ADMIN_SWAGGER_TAGS.auth)
  @ApiOperation({ summary: 'Admin logout' })
  logout() {
    return this.adminService.logout();
  }

  @Get('auth/me')
  @ApiTags(ADMIN_SWAGGER_TAGS.auth)
  @ApiOperation({ summary: 'Get current admin profile' })
  me(@Req() req: Request & { user: AdminJwtUser }) {
    return this.adminService.me(req.user);
  }

  @Get('products')
  @ApiTags(ADMIN_SWAGGER_TAGS.products)
  @ApiOperation({ summary: 'List products (admin)' })
  getProducts() {
    return this.adminService.getAdminProducts();
  }

  @Post('products')
  @ApiTags(ADMIN_SWAGGER_TAGS.products)
  @ApiOperation({ summary: 'Create product (admin)' })
  createProduct(@Body() body: CreateAdminProductDto) {
    return this.adminService.createAdminProduct(
      body as unknown as Record<string, unknown>,
    );
  }

  @Get('products/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.products)
  @ApiOperation({ summary: 'Get product by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Product id' })
  getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getAdminProductById(id);
  }

  @Patch('products/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.products)
  @ApiOperation({ summary: 'Update product by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Product id' })
  patchProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminProductDto,
  ) {
    return this.adminService.patchAdminProduct(
      id,
      body as unknown as Record<string, unknown>,
    );
  }

  @Delete('products/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.products)
  @ApiOperation({ summary: 'Delete product by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Product id' })
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteAdminProduct(id);
  }

  @Get('categories')
  @ApiTags(ADMIN_SWAGGER_TAGS.categories)
  @ApiOperation({ summary: 'List categories (admin)' })
  getCategories() {
    return this.adminService.getAdminCategories();
  }

  @Public()
  @Get('categories/tree')
  @ApiTags(ADMIN_SWAGGER_TAGS.categories)
  @ApiOperation({
    summary:
      'Get categories tree: root -> subcategory A -> subcategory B (admin)',
  })
  getCategoryTree() {
    return this.adminService.getAdminCategoryTree();
  }

  @Post('categories')
  @ApiTags(ADMIN_SWAGGER_TAGS.categories)
  @ApiOperation({ summary: 'Create category (admin)' })
  createCategory(@Body() body: CreateAdminCategoryDto) {
    return this.adminService.createAdminCategory(
      body as unknown as Record<string, unknown>,
    );
  }

  @Post('categories/:parentId/subcategories')
  @ApiTags(ADMIN_SWAGGER_TAGS.categories)
  @ApiOperation({
    summary: 'Create subcategory inside a parent category (root -> A, A -> B)',
  })
  @ApiParam({
    name: 'parentId',
    type: Number,
    description: 'Parent category id',
  })
  createSubcategory(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Body() body: CreateAdminCategoryDto,
  ) {
    return this.adminService.createAdminSubcategory(
      parentId,
      body as unknown as Record<string, unknown>,
    );
  }

  @Patch('categories/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.categories)
  @ApiOperation({ summary: 'Update category by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Category id' })
  patchCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminCategoryDto,
  ) {
    return this.adminService.patchAdminCategory(
      id,
      body as unknown as Record<string, unknown>,
    );
  }

  @Delete('categories/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.categories)
  @ApiOperation({ summary: 'Delete category subtree by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Category id' })
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteAdminCategory(id);
  }

  @Get('brands')
  @ApiTags(ADMIN_SWAGGER_TAGS.brands)
  @ApiOperation({ summary: 'List brands (admin)' })
  getBrands() {
    return this.adminService.getAdminBrands();
  }

  @Post('brands')
  @ApiTags(ADMIN_SWAGGER_TAGS.brands)
  @ApiOperation({ summary: 'Create brand (admin)' })
  createBrand(@Body() body: CreateAdminBrandDto) {
    return this.adminService.createAdminBrand(
      body as unknown as Record<string, unknown>,
    );
  }

  @Patch('brands/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.brands)
  @ApiOperation({ summary: 'Update brand by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Brand id' })
  patchBrand(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminBrandDto,
  ) {
    return this.adminService.patchAdminBrand(
      id,
      body as unknown as Record<string, unknown>,
    );
  }

  @Delete('brands/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.brands)
  @ApiOperation({ summary: 'Delete brand by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Brand id' })
  deleteBrand(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteAdminBrand(id);
  }

  @Get('orders')
  @ApiTags(ADMIN_SWAGGER_TAGS.orders)
  @ApiOperation({ summary: 'List orders (admin)' })
  getOrders() {
    return this.adminService.getAdminOrders();
  }

  @Get('orders/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.orders)
  @ApiOperation({ summary: 'Get order by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Order id' })
  getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getAdminOrderById(id);
  }

  @Patch('orders/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.orders)
  @ApiOperation({ summary: 'Update order by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Order id' })
  patchOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminOrderDto,
  ) {
    return this.adminService.patchAdminOrder(
      id,
      body as unknown as Record<string, unknown>,
    );
  }

  @Get('leads')
  @ApiTags(ADMIN_SWAGGER_TAGS.leads)
  @ApiOperation({ summary: 'List leads (admin)' })
  getLeads() {
    return this.adminService.getAdminLeads();
  }

  @Get('orderCalculation')
  @ApiTags(ADMIN_SWAGGER_TAGS.leads)
  @ApiOperation({ summary: 'List order calculation requests (admin)' })
  getOrderCalculations() {
    return this.adminService.getAdminOrderCalculations();
  }

  @Patch('leads/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.leads)
  @ApiOperation({ summary: 'Update lead by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Lead id' })
  patchLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminLeadDto,
  ) {
    return this.adminService.patchAdminLead(
      id,
      body as unknown as Record<string, unknown>,
    );
  }

  @Get('news')
  @ApiTags(ADMIN_SWAGGER_TAGS.news)
  @ApiOperation({ summary: 'List news (admin)' })
  getNews() {
    return this.adminService.getAdminNews();
  }

  @Post('news')
  @ApiTags(ADMIN_SWAGGER_TAGS.news)
  @ApiOperation({ summary: 'Create news item (admin)' })
  createNews(@Body() body: CreateAdminNewsDto) {
    return this.adminService.createAdminNews(
      body as unknown as Record<string, unknown>,
    );
  }

  @Patch('news/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.news)
  @ApiOperation({ summary: 'Update news item by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'News id' })
  patchNews(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminNewsDto,
  ) {
    return this.adminService.patchAdminNews(
      id,
      body as unknown as Record<string, unknown>,
    );
  }

  @Delete('news/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.news)
  @ApiOperation({ summary: 'Delete news item by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'News id' })
  deleteNews(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteAdminNews(id);
  }

  @Get('articles')
  @ApiTags(ADMIN_SWAGGER_TAGS.articles)
  @ApiOperation({ summary: 'List articles (admin)' })
  getArticles() {
    return this.adminService.getAdminArticles();
  }

  @Post('articles')
  @ApiTags(ADMIN_SWAGGER_TAGS.articles)
  @ApiOperation({ summary: 'Create article (admin)' })
  createArticle(@Body() body: CreateAdminArticleDto) {
    return this.adminService.createAdminArticle(
      body as unknown as Record<string, unknown>,
    );
  }

  @Patch('articles/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.articles)
  @ApiOperation({ summary: 'Update article by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Article id' })
  patchArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminArticleDto,
  ) {
    return this.adminService.patchAdminArticle(
      id,
      body as unknown as Record<string, unknown>,
    );
  }

  @Delete('articles/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.articles)
  @ApiOperation({ summary: 'Delete article by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Article id' })
  deleteArticle(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteAdminArticle(id);
  }

  @Get('projects')
  @ApiTags(ADMIN_SWAGGER_TAGS.projects)
  @ApiOperation({ summary: 'List projects (admin)' })
  getProjects() {
    return this.adminService.getAdminProjects();
  }

  @Post('projects')
  @ApiTags(ADMIN_SWAGGER_TAGS.projects)
  @ApiOperation({ summary: 'Create project with images and equipment (admin)' })
  createProject(@Body() body: CreateAdminProjectDto) {
    return this.adminService.createAdminProject(
      body as unknown as Record<string, unknown>,
    );
  }

  @Patch('projects/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.projects)
  @ApiOperation({ summary: 'Update project with images and equipment (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Project id' })
  patchProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminProjectDto,
  ) {
    return this.adminService.patchAdminProject(
      id,
      body as unknown as Record<string, unknown>,
    );
  }

  @Delete('projects/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.projects)
  @ApiOperation({ summary: 'Delete project by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Project id' })
  deleteProject(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteAdminProject(id);
  }

  @Get('pages')
  @ApiTags(ADMIN_SWAGGER_TAGS.pages)
  @ApiOperation({ summary: 'List pages (admin)' })
  getPages() {
    return this.adminService.getAdminPages();
  }

  @Post('pages')
  @ApiTags(ADMIN_SWAGGER_TAGS.pages)
  @ApiOperation({ summary: 'Create page (admin)' })
  createPage(@Body() body: CreateAdminPageDto) {
    return this.adminService.createAdminPage(
      body as unknown as Record<string, unknown>,
    );
  }

  @Patch('pages/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.pages)
  @ApiOperation({ summary: 'Update page by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Page id' })
  patchPage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminPageDto,
  ) {
    return this.adminService.patchAdminPage(
      id,
      body as unknown as Record<string, unknown>,
    );
  }

  @Delete('pages/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.pages)
  @ApiOperation({ summary: 'Delete page by id (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Page id' })
  deletePage(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteAdminPage(id);
  }

  @Get('files/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.files)
  @ApiOperation({ summary: 'Get uploaded image by id' })
  @ApiParam({ name: 'id', type: String, description: 'File id' })
  getFileById(
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const file = this.adminService.getFileById(id);
    return res.sendFile(file.path);
  }

  @Get('files/:id/meta')
  @ApiTags(ADMIN_SWAGGER_TAGS.files)
  @ApiOperation({ summary: 'Get uploaded image metadata by id' })
  @ApiParam({ name: 'id', type: String, description: 'File id' })
  @ApiOkResponse({ type: AdminFileMetaResponseDto })
  getFileMetaById(@Param('id') id: string) {
    return this.adminService.getFileMetaById(id);
  }

  @Post('files/upload')
  @ApiTags(ADMIN_SWAGGER_TAGS.files)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          ensureUploadsDir();
          callback(null, UPLOADS_DIR);
        },
        filename: (_req, file, callback) => {
          const { filename } = buildStoredFilename(file.originalname);
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AdminUploadFileBodyDto })
  @ApiCreatedResponse({ type: AdminUploadFileResponseDto })
  @ApiOperation({ summary: 'Upload image file' })
  uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder().build({
        fileIsRequired: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    file: unknown,
  ) {
    return this.adminService.uploadFile(file as StoredUploadFile);
  }

  @Delete('files/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.files)
  @ApiOperation({ summary: 'Delete uploaded file by id' })
  @ApiParam({ name: 'id', type: String, description: 'File id' })
  deleteFile(@Param('id') id: string) {
    return this.adminService.deleteFile(id);
  }

  @Post('import/price')
  @ApiTags(ADMIN_SWAGGER_TAGS.imports)
  @ApiOperation({ summary: 'Start price import job (stub)' })
  startImportPrice() {
    return this.adminService.startImportPrice();
  }

  @Post('import/categories')
  @ApiTags(ADMIN_SWAGGER_TAGS.imports)
  @ApiOperation({
    summary: 'Import categories tree: root -> subcategoriesA[] -> subcategoriesB[]',
  })
  @ApiExtraModels(ImportAdminCategoryNodeDto, ImportAdminCategoriesBatchDto)
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(ImportAdminCategoryNodeDto) },
        { $ref: getSchemaPath(ImportAdminCategoriesBatchDto) },
      ],
    },
  })
  importCategories(
    @Body() body: ImportAdminCategoryNodeDto | ImportAdminCategoriesBatchDto,
  ) {
    return this.adminService.importAdminCategories(body);
  }

  @Post('import/products')
  @ApiTags(ADMIN_SWAGGER_TAGS.imports)
  @ApiOperation({ summary: 'Import products array' })
  @ApiBody({ type: [ImportAdminProductDto] })
  importProducts(
    @Body(new ParseArrayPipe({ items: ImportAdminProductDto }))
    body: ImportAdminProductDto[],
  ) {
    return this.adminService.importAdminProducts(
      body as unknown as Record<string, unknown>[],
    );
  }

  @Get('import/jobs/:id')
  @ApiTags(ADMIN_SWAGGER_TAGS.imports)
  @ApiOperation({ summary: 'Get price import job status (stub)' })
  @ApiParam({ name: 'id', type: String, description: 'Import job id' })
  getImportJob(@Param('id') id: string) {
    return this.adminService.getImportJob(id);
  }

  @Get('audit-logs')
  @ApiTags(ADMIN_SWAGGER_TAGS.auditLogs)
  @ApiOperation({ summary: 'List audit logs (admin)' })
  getAuditLogs() {
    return this.adminService.getAuditLogs();
  }
}
