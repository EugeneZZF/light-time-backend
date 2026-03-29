import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ArticlesModule } from './modules/articles/articles.module';
import { AdminModule } from './modules/admin/admin.module';
import { CartModule } from './modules/cart/cart.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';
import { LeadsModule } from './modules/leads/leads.module';
import { NewsModule } from './modules/news/news.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SearchModule } from './modules/search/search.module';
import { FilesModule } from './modules/files/files.module';
import { ensureUploadsDir, UPLOADS_DIR } from './modules/admin/admin-files';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  ensureUploadsDir();

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  app.useStaticAssets(UPLOADS_DIR, {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const publicSwaggerConfig = new DocumentBuilder()
    .setTitle('Light Time Backend API')
    .setDescription('Interactive API documentation for public endpoints')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const publicDocument = SwaggerModule.createDocument(app, publicSwaggerConfig, {
    include: [
      HealthModule,
      CatalogModule,
      SearchModule,
      CartModule,
      OrdersModule,
      LeadsModule,
      ArticlesModule,
      NewsModule,
      ProjectsModule,
      FilesModule,
    ],
  });
  SwaggerModule.setup('docs', app, publicDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const adminSwaggerConfig = new DocumentBuilder()
    .setTitle('Light Time Admin API')
    .setDescription('Interactive API documentation for admin panel endpoints')
    .setVersion('1.0.0')
    .addTag('Admin Auth', 'Authentication endpoints for the admin panel')
    .addTag('Admin Products', 'Product management endpoints for the admin panel')
    .addTag('Admin Categories', 'Category management endpoints for the admin panel')
    .addTag('Admin Brands', 'Brand management endpoints for the admin panel')
    .addTag('Admin Orders', 'Order management endpoints for the admin panel')
    .addTag('Admin Leads', 'Lead management endpoints for the admin panel')
    .addTag('Admin News', 'News management endpoints for the admin panel')
    .addTag('Admin Articles', 'Article management endpoints for the admin panel')
    .addTag('Admin Projects', 'Project management endpoints for the admin panel')
    .addTag('Admin Pages', 'Page management endpoints for the admin panel')
    .addTag('Admin Files', 'File management endpoints for the admin panel')
    .addTag('Admin Imports', 'Import endpoints for the admin panel')
    .addTag('Admin Audit Logs', 'Audit log endpoints for the admin panel')
    .addBearerAuth()
    .build();

  const adminDocument = SwaggerModule.createDocument(app, adminSwaggerConfig, {
    include: [AdminModule],
  });
  SwaggerModule.setup('docs/admin', app, adminDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 4242);
}
bootstrap();
