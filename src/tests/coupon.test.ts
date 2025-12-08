import request from 'supertest';
import express from 'express';
import cartRoutes from '../routes/cartRoutes';
import { prisma } from '../config/constants';
import { DiscountType } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/cart', cartRoutes);

describe('Coupon System Tests', () => {
  const userId = 'test-user-coupon-1';
  let productId: number;

  beforeAll(async () => {
    // 1. Setup Product
    const product = await prisma.product.upsert({
      where: { sku: 'TEST-PROD-COUPON' },
      update: {},
      create: {
        sku: 'TEST-PROD-COUPON',
        name: 'Test Coupon Product',
        priceCents: 5000, // $50.00
      },
    });
    productId = product.id;

    // 2. Setup Coupons
    // Fixed $20 Off
    await prisma.coupon.upsert({
      where: { code: 'TESTFIX20' },
      update: { currentUses: 0 }, // Reset uses
      create: {
        code: 'TESTFIX20',
        discountType: DiscountType.FIXED,
        discountValue: 20,
      },
    });

    // 10% Off
    await prisma.coupon.upsert({
      where: { code: 'TEST10PERCENT' },
      update: { currentUses: 0 },
      create: {
        code: 'TEST10PERCENT',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
      },
    });

    // Min Total $100
    await prisma.coupon.upsert({
      where: { code: 'MIN100' },
      update: { currentUses: 0 },
      create: {
        code: 'MIN100',
        discountType: DiscountType.FIXED,
        discountValue: 50,
        minCartTotalCents: 10000,
      },
    });
  });

  beforeEach(async () => {
    // Reset cart before each test
    await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    await prisma.cart.deleteMany({ where: { userId } });

    // Add 1 item ($50)
    await request(app)
      .post(`/cart/${userId}/item`)
      .send({ productId, quantity: 1 });
  });

  it('should apply a fixed discount coupon successfully', async () => {
    const res = await request(app)
      .post(`/cart/${userId}/coupon/apply`)
      .send({ code: 'TESTFIX20' });

    expect(res.statusCode).toBe(200);
    expect(res.body.totals.subtotalCents).toBe(5000);
    expect(res.body.totals.discountCents).toBe(2000); // $20
    expect(res.body.totals.finalTotalCents).toBe(3000);
    expect(res.body.totals.appliedCouponCode).toBe('TESTFIX20');
  });

  it('should apply a percentage discount coupon successfully', async () => {
    const res = await request(app)
      .post(`/cart/${userId}/coupon/apply`)
      .send({ code: 'TEST10PERCENT' });

    expect(res.statusCode).toBe(200);
    expect(res.body.totals.subtotalCents).toBe(5000);
    expect(res.body.totals.discountCents).toBe(500); // 10% of 5000 = 500
    expect(res.body.totals.finalTotalCents).toBe(4500);
  });

  it('should fail to apply coupon if minimum total not met', async () => {
    // Current cart is $50, coupon needs $100
    const res = await request(app)
      .post(`/cart/${userId}/coupon/apply`)
      .send({ code: 'MIN100' });

    expect(res.statusCode).toBe(400); // Controller returns 400 on error
    expect(res.body.error).toContain('Minimum cart total');
  });

  it('should apply best auto-coupon if no manual coupon', async () => {
    // Clean start
    await prisma.coupon.deleteMany({ where: { code: 'AUTO5' } });

    // Create an auto-apply coupon better than others?
    // Let's make an auto coupon for $5 off
    await prisma.coupon.create({
      data: {
        code: 'AUTO5',
        discountType: 'FIXED',
        discountValue: 5,
        autoApply: true
      }
    });

    // We just GET the cart, it should auto-apply
    const res = await request(app).get(`/cart/${userId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.totals.appliedCouponCode).toBe('AUTO5');
    expect(res.body.totals.discountCents).toBe(500);
  });

  it('should not overuse a coupon (Concurrency/Max Uses check)', async () => {
    // Ensure clean state even if previous run crashed
    await prisma.coupon.deleteMany({ where: { code: 'ONETIME' } });

    // Create a coupon with maxUses = 1
    await prisma.coupon.create({
      data: {
        code: 'ONETIME',
        discountType: 'FIXED',
        discountValue: 100,
        maxUses: 1,
        currentUses: 0
      }
    });

    // First user applies it
    const res1 = await request(app)
      .post(`/cart/${userId}/coupon/apply`)
      .send({ code: 'ONETIME' });
    expect(res1.statusCode).toBe(200);

    // Second user setup (must have a cart first)
    const userId2 = `${userId}-other`;
    await prisma.cart.create({ data: { userId: userId2 } });

    // Second user tries to apply it (should fail)
    const res2 = await request(app)
      .post(`/cart/${userId2}/coupon/apply`)
      .send({ code: 'ONETIME' });

    expect(res2.statusCode).toBe(400);
    expect(res2.body.error).toMatch(/limit reached/i);

    // Cleanup
    await prisma.coupon.delete({ where: { code: 'ONETIME' } });
    await prisma.cart.delete({ where: { userId: userId2 } });
  });

  afterAll(async () => {
    // Clean up AUTO5 to prevent leaking into other tests
    try {
      await prisma.coupon.delete({ where: { code: 'AUTO5' } });
    } catch (e) { }
  });

});
