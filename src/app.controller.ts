import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Docs')
@Controller()
export class AppController {
  @Get()
  @Redirect('/docs')
  @ApiOperation({ summary: 'Redirect to Swagger UI' })
  getHello() {
    return;
  }
}
