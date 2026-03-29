import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateCallbackLeadDto } from './dto/create-callback-lead.dto';

@ApiTags('Leads')
@Controller('api/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('callback')
  @ApiOperation({ summary: 'Create callback lead request' })
  createLead(@Body() body: CreateCallbackLeadDto) {
    return this.leadsService.createCallbackLead(body);
  }
}
