import { Injectable } from '@nestjs/common';
import { prisma } from '../../../prisma/prisma';

@Injectable()
export class SearchService {
  async searchProducts(query: string | undefined) {
    const q = query?.trim();
    if (!q) {
      return [];
    }

    return prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
      },
    });
  }
}

