import { Injectable } from '@nestjs/common';
import { prisma } from '../../../prisma/prisma';

@Injectable()
export class HealthService {
  async getReadiness() {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'up' };
  }
}

