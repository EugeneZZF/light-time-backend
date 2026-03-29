import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SearchModule } from './modules/search/search.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { HealthModule } from './modules/health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { NewsModule } from './modules/news/news.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [
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
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
