import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'New quantity for item' })
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ example: 'abc-session', description: 'Cart session id' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
