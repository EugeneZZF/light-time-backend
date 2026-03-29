import { Injectable } from '@nestjs/common';
import { prisma } from '../../../prisma/prisma';
import { CreateCallbackLeadDto } from './dto/create-callback-lead.dto';

@Injectable()
export class LeadsService {
  async createCallbackLead(body: CreateCallbackLeadDto) {
    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        phone: body.phone,
        source: body.source ?? 'callback',
        comment: body.comment,
      },
    });

    return { id: lead.id, status: lead.status, createdAt: lead.createdAt };
  }
}

