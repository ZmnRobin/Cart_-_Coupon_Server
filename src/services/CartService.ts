import { Cart, CartItem, Product, Coupon, DiscountType } from '@prisma/client';
import { prisma } from '../config/constants';
import { couponService } from './CouponService';
import { CartResponse, CartTotal } from '../types';

export class CartService {
  
  async getCart(userId: string): Promise<CartResponse> {
    // Ensure cart exists
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
        // Ignore if already deleted
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

    // Attempt to increment usage (Concurrency Check)
    const success = await couponService.incrementCouponUsage(coupon.id);
    if (!success) {
         throw new Error('Coupon usage limit reached or collision detected. Please try again.');
    }

    // If there was an existing coupon, we should decrement its usage?
    // The requirement implies "The code currently applied". 
    // If we overwrite, we should decrement the old one.
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

  /**
   * The Core Function: defaults, autos, updates, totals.
   */
  async calculateCartTotal(cart: Cart & { items: (CartItem & { product: Product })[] }): Promise<CartResponse> {
    // 1. Calculate Subtotal
    const subtotalCents = cart.items.reduce((acc, item) => acc + (item.product.priceCents * item.quantity), 0);
    
    // 2. Determine Coupon to Use
    // Priority: Manual Coupon -> Auto Coupon
    // Wait, requirement says: "first check for and apply the best available Auto-Applied Coupon, then re-check the manually applied coupon."
    // This implies we might OVERRIDE the manual one if auto is better? 
    // Or just that we should define what "appliedCouponCode" is.
    // Usually "Auto Apply" fills the slot if empty.
    // Let's assume: If manually applied, we validate it. If invalid, remove it. 
    // If NO manual coupon, try to find an auto one.
    
    let activeCouponCode = cart.appliedCouponCode;
    let activeCoupon: Coupon | null = null;
    let didUpdateCoupon = false;

    // Check manual
    if (activeCouponCode) {
        activeCoupon = await prisma.coupon.findUnique({ where: { code: activeCouponCode } });
        if (activeCoupon) {
            const validation = await couponService.validateCoupon(activeCoupon, cart);
            if (!validation.valid) {
                // Remove invalid manual coupon
                await this.removeCoupon(cart.userId); // This saves to DB
                // activeCouponCode = null;
                 // We need to fetch cart again or just update local state?
                 // Let's rely on DB state.
                 // Actually this function computes "details", it shouldn't necessarily mutate DB unless correcting state.
                 // Correcting state (removing invalid coupon) is good practice.
                 activeCoupon = null;
            }
        }
    }

    // Check Auto if none active
    if (!activeCoupon) {
        const autoCoupon = await couponService.findBestAutoCoupon(cart);
        if (autoCoupon) {
            // Apply it!
            // Need to verify concurrency here too? 
            // Yes, technically.
            const success = await couponService.incrementCouponUsage(autoCoupon.id);
            if (success) {
                await prisma.cart.update({
                    where: { id: cart.id },
                    data: { appliedCouponCode: autoCoupon.code }
                });
                activeCoupon = autoCoupon;
            }
        }
    }

    // 3. Calculate Discount
    let discountCents = 0;
    if (activeCoupon) {
        if (activeCoupon.discountType === DiscountType.FIXED) {
             // discountValue is Decimal, e.g. 10.00
             discountCents = Math.floor(activeCoupon.discountValue.toNumber() * 100);
        } else {
            // Percentage
            const percent = activeCoupon.discountValue.toNumber(); // e.g. 10 for 10%
            discountCents = Math.floor(subtotalCents * (percent / 100));
            
            if (activeCoupon.maxDiscountCents !== null) {
                discountCents = Math.min(discountCents, activeCoupon.maxDiscountCents);
            }
        }
    }

    // Ensure discount doesn't exceed total
    if (discountCents > subtotalCents) {
        discountCents = subtotalCents;
    }

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
            appliedCouponCode: activeCoupon ? activeCoupon.code : null
        }
    };
  }
}

export const cartService = new CartService();
