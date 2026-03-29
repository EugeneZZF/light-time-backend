import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('Search')
@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search products by query string' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.searchProducts(query.q);
  }
}
