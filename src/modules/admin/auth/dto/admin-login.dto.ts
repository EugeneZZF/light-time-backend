import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Admin email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123', description: 'Admin password' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class CreateAdminBootstrapDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Admin email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123', description: 'Admin password' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Site Admin', description: 'Admin full name', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;
}
