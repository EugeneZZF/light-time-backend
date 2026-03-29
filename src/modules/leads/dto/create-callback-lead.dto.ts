import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCallbackLeadDto {
  @ApiProperty({ example: 'Иван', description: 'Lead name' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '+79991234567', description: 'Lead phone number' })
  @IsString()
  @MinLength(5)
  phone!: string;

  @ApiPropertyOptional({ example: 'project-page', description: 'Lead source tag' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'Нужна консультация', description: 'Lead comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
