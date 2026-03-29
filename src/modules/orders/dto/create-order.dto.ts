import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 123, description: 'Product id' })
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiPropertyOptional({ example: 1, description: 'Quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}

export class CreateOrderDto {
  @ApiProperty({
    type: [CreateOrderItemDto],
    description: 'Products included in the order',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty({ example: 'Иван Иванов', description: 'Customer full name' })
  @IsString()
  @MinLength(2)
  customer!: string;

  @ApiProperty({ example: '+79991234567', description: 'Customer phone number' })
  @IsString()
  @MinLength(5)
  phone!: string;

  @ApiPropertyOptional({ example: 'ivan@example.com', description: 'Customer email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Позвонить за час', description: 'Order comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
