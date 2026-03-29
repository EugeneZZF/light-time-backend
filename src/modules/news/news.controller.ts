import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NewsService } from './news.service';

@ApiTags('News')
@Controller('api/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get published news list' })
  getNewsList() {
    return this.newsService.getNewsList();
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest published news' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of news items to return' })
  getLatestNews(@Query('limit') limit?: string) {
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;
    return this.newsService.getLatestNews(parsedLimit);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published news by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'News slug' })
  getNewsBySlug(@Param('slug') slug: string) {
    return this.newsService.getNewsBySlug(slug);
  }
}
