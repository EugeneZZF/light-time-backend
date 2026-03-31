import { Injectable } from '@nestjs/common';
import { prisma } from '../../../prisma/prisma';
import { CreateCallbackLeadDto } from './dto/create-callback-lead.dto';
import { CreateOrderCalculationDto } from './dto/create-order-calculation.dto';

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

  async createOrderCalculation(body: CreateOrderCalculationDto) {
    const lead = await prisma.lead.create({
      data: {
        name: 'Order calculation',
        phone: body.phone,
        source: 'orderCalculation',
      },
    });

    return {
      id: lead.id,
      phone: lead.phone,
      status: lead.status,
      source: lead.source,
      createdAt: lead.createdAt,
    };
  }
}

