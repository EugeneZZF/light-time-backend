import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '../../../prisma/prisma';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  async createOrder(body: CreateOrderDto) {
    if (body.items.length === 0) {
      throw new BadRequestException('Order items are required');
    }

    const itemsByProductId = new Map<number, number>();
    for (const item of body.items) {
      itemsByProductId.set(
        item.productId,
        (itemsByProductId.get(item.productId) ?? 0) + (item.quantity ?? 1),
      );
    }

    const productIds = Array.from(itemsByProductId.keys());
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((product) => product.id));
      const invalidIds = productIds.filter((productId) => !foundIds.has(productId));
      throw new BadRequestException(
        `Products not found or inactive: ${invalidIds.join(', ')}`,
      );
    }

    const total = products.reduce((sum, product) => {
      const quantity = itemsByProductId.get(product.id) ?? 0;
      return sum + Number(product.price) * quantity;
    }, 0);

    const orderNumber = `ORD-${Date.now()}`;

    return prisma.order.create({
      data: {
        orderNumber,
        customer: body.customer,
        phone: body.phone,
        email: body.email,
        comment: body.comment,
        total: total.toFixed(2),
        items: {
          create: products.map((product) => ({
            productId: product.id,
            productName: product.name,
            price: Number(product.price),
            quantity: itemsByProductId.get(product.id) ?? 1,
          })),
        },
      },
      include: { items: true },
    });
  }
}
