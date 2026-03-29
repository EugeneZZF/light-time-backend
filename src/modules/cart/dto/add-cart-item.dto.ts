import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({ example: 123, description: 'Product id' })
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiPropertyOptional({ example: 1, description: 'Quantity to add' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({ example: 'abc-session', description: 'Cart session id' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
