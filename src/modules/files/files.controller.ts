import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { buildStoredFileMeta, findStoredFilenameById } from '../admin/admin-files';

@ApiTags('Files')
@Controller('api/files')
export class FilesController {
  @Get(':id')
  @ApiOperation({ summary: 'Get uploaded image by id (public)' })
  @ApiParam({ name: 'id', type: String, description: 'File id' })
  getFileById(@Param('id') id: string, @Res({ passthrough: false }) res: Response) {
    const storedFilename = findStoredFilenameById(id);

    if (!storedFilename) {
      throw new NotFoundException('File not found');
    }

    const file = buildStoredFileMeta(storedFilename);
    res.type(file.mimeType);
    return res.sendFile(file.path);
  }
}
