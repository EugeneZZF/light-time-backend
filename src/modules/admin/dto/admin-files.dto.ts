import { ApiProperty } from '@nestjs/swagger';

export class AdminUploadFileBodyDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image file to upload',
  })
  file!: unknown;
}

export class AdminUploadFileResponseDto {
  @ApiProperty({ example: '0f5d6f71-2c32-4a8b-b529-f86c191f5b30' })
  id!: string;

  @ApiProperty({ example: '/uploads/0f5d6f71-2c32-4a8b-b529-f86c191f5b30.webp' })
  url!: string;

  @ApiProperty({ example: 'preview.webp' })
  originalName!: string;

  @ApiProperty({ example: 'image/webp' })
  mimeType!: string;

  @ApiProperty({ example: 245612 })
  size!: number;
}

export class AdminFileMetaResponseDto {
  @ApiProperty({ example: '0f5d6f71-2c32-4a8b-b529-f86c191f5b30' })
  id!: string;

  @ApiProperty({ example: '0f5d6f71-2c32-4a8b-b529-f86c191f5b30.webp' })
  filename!: string;

  @ApiProperty({ example: '.webp' })
  extension!: string;

  @ApiProperty({ example: '/uploads/0f5d6f71-2c32-4a8b-b529-f86c191f5b30.webp' })
  url!: string;

  @ApiProperty({ example: 'image/webp' })
  mimeType!: string;

  @ApiProperty({ example: 245612 })
  size!: number;
}
