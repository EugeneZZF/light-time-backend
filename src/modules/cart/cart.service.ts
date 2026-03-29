import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../prisma/prisma';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  async getCart(sessionId?: string) {
    if (!sessionId) {
      return { sessionId: null, items: [], total: 0 };
    }

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, price: true },
            },
          },
        },
      },
    });

    if (!cart) {
      return { sessionId, items: [], total: 0 };
    }

    const total = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    return { sessionId, items: cart.items, total };
  }

  async addItem(body: AddCartItemDto, sessionIdFromHeader?: string) {
    const sessionId = body.sessionId ?? sessionIdFromHeader ?? randomUUID();
    const quantity = body.quantity ?? 1;

    const product = await prisma.product.findFirst({
      where: { id: body.productId, isActive: true },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const cart = await prisma.cart.upsert({
      where: { sessionId },
      create: { sessionId },
      update: {},
      select: { id: true, sessionId: true },
    });

    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: body.productId } },
      select: { id: true, quantity: true },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: body.productId, quantity },
      });
    }

    return this.getCart(sessionId);
  }

  async updateItem(
    itemId: number,
    body: UpdateCartItemDto,
    sessionIdFromHeader?: string,
  ) {
    const sessionId = body.sessionId ?? sessionIdFromHeader;
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { sessionId: true } } },
    });

    if (!item || item.cart.sessionId !== sessionId) {
      throw new NotFoundException('Cart item not found');
    }

    if (body.quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: body.quantity },
      });
    }

    return this.getCart(sessionId);
  }

  async removeItem(itemId: number, sessionId?: string) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { sessionId: true } } },
    });

    if (!item || item.cart.sessionId !== sessionId) {
      throw new NotFoundException('Cart item not found');
    }

    await prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(sessionId);
  }
}

