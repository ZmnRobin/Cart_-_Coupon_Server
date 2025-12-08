import { Cart, CartItem, Product, Coupon, DiscountType } from '@prisma/client';
import { prisma } from '../config/constants';
import { couponService } from './CouponService';
import { CartResponse, CartTotal } from '../types';

export class CartService {

  async getCart(userId: string): Promise<CartResponse> {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { product: true } }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true } } }
      });
    }

    return this.calculateCartTotal(cart);
  }

  async addItem(userId: string, productId: number, quantity: number = 1): Promise<CartResponse> {
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId
        }
      }
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity
        }
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: number, quantity: number): Promise<CartResponse> {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new Error('Cart not found');

    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    await prisma.cartItem.update({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId
        }
      },
      data: { quantity }
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: number): Promise<CartResponse> {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new Error('Cart not found');

    try {
      await prisma.cartItem.delete({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId
          }
        }
      });
    } catch (e) {

    }

    return this.getCart(userId);
  }

  async applyCoupon(userId: string, code: string): Promise<CartResponse> {
    const cart = await prisma.cart.findUnique({ where: { userId }, include: { items: { include: { product: true } } } });
    if (!cart) throw new Error('Cart not found');

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new Error('Coupon not found');

    const validation = await couponService.validateCoupon(coupon, cart);
    if (!validation.valid) {
      throw new Error(`Invalid Coupon: ${validation.reason}`);
    }
    const success = await couponService.incrementCouponUsage(coupon.id);
    if (!success) {
      throw new Error('Coupon usage limit reached or collision detected. Please try again.');
    }
    if (cart.appliedCouponCode && cart.appliedCouponCode !== code) {
      const oldCoupon = await prisma.coupon.findUnique({ where: { code: cart.appliedCouponCode } });
      if (oldCoupon) {
        await couponService.decrementCouponUsage(oldCoupon.id);
      }
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: { appliedCouponCode: code }
    });

    return this.getCart(userId);
  }

  async removeCoupon(userId: string): Promise<CartResponse> {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart?.appliedCouponCode) {
      const oldCoupon = await prisma.coupon.findUnique({ where: { code: cart.appliedCouponCode } });
      if (oldCoupon) {
        await couponService.decrementCouponUsage(oldCoupon.id);
      }
      await prisma.cart.update({
        where: { id: cart.id },
        data: { appliedCouponCode: null }
      });
    }
    return this.getCart(userId);
  }

  private calculateCouponDiscount(coupon: Coupon, subtotalCents: number): number {
    let discountCents = 0;
    if (coupon.discountType === DiscountType.FIXED) {
      discountCents = Math.floor(coupon.discountValue.toNumber() * 100);
    } else {
      const percent = coupon.discountValue.toNumber();
      discountCents = Math.floor(subtotalCents * (percent / 100));

      if (coupon.maxDiscountCents !== null) {
        discountCents = Math.min(discountCents, coupon.maxDiscountCents);
      }
    }
    return Math.min(discountCents, subtotalCents);
  }

  async calculateCartTotal(cart: Cart & { items: (CartItem & { product: Product })[] }): Promise<CartResponse> {
    // 1. Calculate Subtotal
    const subtotalCents = cart.items.reduce((acc, item) => acc + (item.product.priceCents * item.quantity), 0);

    let activeCouponCode = cart.appliedCouponCode;
    let activeCoupon: Coupon | null = null;
    let isManualCoupon = false;

    if (activeCouponCode) {
      activeCoupon = await prisma.coupon.findUnique({ where: { code: activeCouponCode } });
      if (activeCoupon) {
        const validation = await couponService.validateCoupon(activeCoupon, cart);
        if (!validation.valid) {
          await this.removeCoupon(cart.userId);
          activeCouponCode = null;
          activeCoupon = null;
        } else {
          isManualCoupon = !activeCoupon.autoApply;
        }
      } else {
        await prisma.cart.update({
          where: { id: cart.id },
          data: { appliedCouponCode: null }
        });
        activeCouponCode = null;
      }
    }

    // Always check for best auto-coupon (unless a manual coupon is active)
    if (!isManualCoupon) {
      const bestAutoCoupon = await couponService.findBestAutoCoupon(cart);

      if (bestAutoCoupon && (!activeCoupon || bestAutoCoupon.code !== activeCoupon.code)) {
        // Calculate which coupon gives better discount
        const currentDiscount = activeCoupon ? this.calculateCouponDiscount(activeCoupon, subtotalCents) : 0;
        const newDiscount = this.calculateCouponDiscount(bestAutoCoupon, subtotalCents);

        if (newDiscount > currentDiscount) {
          if (activeCoupon && activeCoupon.autoApply) {
            await couponService.decrementCouponUsage(activeCoupon.id);
          }

          // Apply new auto-coupon
          const success = await couponService.incrementCouponUsage(bestAutoCoupon.id);
          if (success) {
            await prisma.cart.update({
              where: { id: cart.id },
              data: { appliedCouponCode: bestAutoCoupon.code }
            });
            activeCoupon = bestAutoCoupon;
            activeCouponCode = bestAutoCoupon.code;
          }
        }
      } else if (!activeCoupon && !bestAutoCoupon) {
        if (cart.appliedCouponCode) {
          await prisma.cart.update({
            where: { id: cart.id },
            data: { appliedCouponCode: null }
          });
        }
      }
    }

    // 3. Calculate Discount
    const discountCents = activeCoupon ? this.calculateCouponDiscount(activeCoupon, subtotalCents) : 0;

    const finalTotalCents = subtotalCents - discountCents;

    return {
      items: cart.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        name: i.product.name,
        priceCents: i.product.priceCents,
        totalCents: i.product.priceCents * i.quantity
      })),
      totals: {
        subtotalCents,
        discountCents,
        finalTotalCents,
        appliedCouponCode: activeCouponCode
      }
    };
  }
}

export const cartService = new CartService();
