import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiPropertyOptional({ example: 'led panel', description: 'Search query' })
  @IsOptional()
  @IsString()
  q?: string;
}
