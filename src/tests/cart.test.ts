import request from 'supertest';
import express from 'express';
import cartRoutes from '../routes/cartRoutes';
import { prisma } from '../config/constants';

const app = express();
app.use(express.json());
app.use('/cart', cartRoutes);

describe('Cart API Integration Tests', () => {
  const userId = 'test-user-cart-1';
  let productId: number;

  beforeAll(async () => {
    // Ensure product exists
    const product = await prisma.product.upsert({
      where: { sku: 'TEST-PROD-CART' },
      update: {},
      create: {
        sku: 'TEST-PROD-CART',
        name: 'Test Cart Product',
        priceCents: 2000, // $20.00
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    // Cleanup
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.delete({ where: { id: cart.id } });
    }
  });

  it('should create a cart and add an item', async () => {
    const res = await request(app)
      .post(`/cart/${userId}/item`)
      .send({ productId, quantity: 2 });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.totals.subtotalCents).toBe(4000); // 2 * 2000
    expect(res.body.totals.finalTotalCents).toBe(4000);
  });

  it('should update item quantity', async () => {
    const res = await request(app)
      .put(`/cart/${userId}/item/${productId}`)
      .send({ quantity: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.items[0].quantity).toBe(5);
    expect(res.body.totals.subtotalCents).toBe(10000); // 5 * 2000
  });

  it('should remove item when quantity is updated to 0', async () => {
    const res = await request(app)
      .put(`/cart/${userId}/item/${productId}`)
      .send({ quantity: 0 });

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.totals.subtotalCents).toBe(0);
  });

  it('should handle removing non-existent item gracefully or throw 400', async () => {
     // Our logic currently returns the cart state if item doesn't exist to delete
     const res = await request(app).delete(`/cart/${userId}/item/99999`);
     expect(res.statusCode).toBe(200);
     expect(res.body.items).toHaveLength(0);
  });
});
