import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('Cart')
@Controller('api/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart by session id' })
  @ApiQuery({ name: 'sessionId', required: false, type: String, description: 'Session id in query' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'Session id in header' })
  getCart(
    @Query('sessionId') sessionIdFromQuery?: string,
    @Headers('x-session-id') sessionIdFromHeader?: string,
  ) {
    return this.cartService.getCart(sessionIdFromQuery ?? sessionIdFromHeader);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add product to cart' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'Session id in header' })
  addItem(
    @Body() body: AddCartItemDto,
    @Headers('x-session-id') sessionIdFromHeader?: string,
  ) {
    return this.cartService.addItem(body, sessionIdFromHeader);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'itemId', type: Number, description: 'Cart item id' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'Session id in header' })
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: UpdateCartItemDto,
    @Headers('x-session-id') sessionIdFromHeader?: string,
  ) {
    return this.cartService.updateItem(itemId, body, sessionIdFromHeader);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'itemId', type: Number, description: 'Cart item id' })
  @ApiQuery({ name: 'sessionId', required: false, type: String, description: 'Session id in query' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'Session id in header' })
  removeItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('sessionId') sessionIdFromQuery?: string,
    @Headers('x-session-id') sessionIdFromHeader?: string,
  ) {
    return this.cartService.removeItem(itemId, sessionIdFromQuery ?? sessionIdFromHeader);
  }
}
