import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';

@ApiTags('Articles')
@Controller('api/articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Get published articles list' })
  getArticlesList() {
    return this.articlesService.getArticlesList();
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest published articles' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of articles to return' })
  getLatestArticles(@Query('limit') limit?: string) {
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;
    return this.articlesService.getLatestArticles(parsedLimit);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published article by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Article slug' })
  getArticleBySlug(@Param('slug') slug: string) {
    return this.articlesService.getArticleBySlug(slug);
  }
}
