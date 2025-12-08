import { Coupon, Cart, CartItem, Product, PrismaClient } from '@prisma/client';
import { prisma } from '../config/constants';

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export class CouponService {

  async validateCoupon(coupon: Coupon, cart: Cart & { items: (CartItem & { product: Product })[] }): Promise<ValidationResult> {

    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      return { valid: false, reason: 'Coupon has expired' };
    }

    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      return { valid: false, reason: 'Coupon usage limit reached' };
    }
    const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    if (coupon.minCartItems !== null && totalItems < coupon.minCartItems) {
      return { valid: false, reason: `Minimum ${coupon.minCartItems} items required` };
    }
    const subtotal = cart.items.reduce((acc, item) => acc + (item.product.priceCents * item.quantity), 0);
    if (coupon.minCartTotalCents !== null && subtotal < coupon.minCartTotalCents) {
      return { valid: false, reason: `Minimum cart total of ${(coupon.minCartTotalCents / 100).toFixed(2)} required` };
    }

    const restrictions = await prisma.productRestriction.findMany({
      where: { couponId: coupon.id },
      select: { productId: true }
    });

    if (restrictions.length > 0) {
      const allowedProductIds = new Set(restrictions.map(r => r.productId));
      const hasAllowedProduct = cart.items.some(item => allowedProductIds.has(item.productId));
      if (!hasAllowedProduct) {
        return { valid: false, reason: 'Coupon is not applicable to any items in your cart' };
      }
    }
    return { valid: true };
  }

  async incrementCouponUsage(couponId: number): Promise<boolean> {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;

      const coupon = await prisma.coupon.findUnique({
        where: { id: couponId }
      });

      if (!coupon) return false;

      if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
        return false;
      }

      try {
        const result = await prisma.coupon.update({
          where: {
            id: couponId,
            version: coupon.version
          },
          data: {
            currentUses: { increment: 1 },
            version: { increment: 1 }
          }
        });

        return true;
      } catch (error: any) {
        if (error.code === 'P2025') {
          console.log(`Concurrency conflict for coupon ${couponId}, retrying...`);
          continue;
        }
        throw error;
      }
    }

    return false;
  }

  async decrementCouponUsage(couponId: number): Promise<void> {
    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        currentUses: { decrement: 1 },
        version: { increment: 1 }
      }
    });
  }

  async findBestAutoCoupon(cart: Cart & { items: (CartItem & { product: Product })[] }): Promise<Coupon | null> {

    const autoCoupons = await prisma.coupon.findMany({
      where: { autoApply: true }
    });

    let bestCoupon: Coupon | null = null;
    let maxDiscountCents = -1;

    const calculateDiscount = (coupon: Coupon, subtotal: number): number => {
      if (coupon.discountType === 'FIXED') {
        return Math.floor(coupon.discountValue.toNumber() * 100);
      } else {
        let discount = Math.floor(subtotal * (coupon.discountValue.toNumber() / 100));
        if (coupon.maxDiscountCents !== null) {
          discount = Math.min(discount, coupon.maxDiscountCents);
        }
        return discount;
      }
    };

    const subtotal = cart.items.reduce((acc, item) => acc + (item.product.priceCents * item.quantity), 0);

    for (const coupon of autoCoupons) {
      const result = await this.validateCoupon(coupon, cart);
      if (result.valid) {
        const potentialDiscount = calculateDiscount(coupon, subtotal);
        if (potentialDiscount > maxDiscountCents) {
          maxDiscountCents = potentialDiscount;
          bestCoupon = coupon;
        }
      }
    }

    return bestCoupon;
  }
}

export const couponService = new CouponService();
