import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateOrderCalculationDto {
  @ApiProperty({
    example: '+79991234567',
    description: 'Phone number for order calculation request',
  })
  @IsString()
  @MinLength(5)
  phone!: string;
}
