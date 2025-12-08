import { Request, Response } from 'express';
import { cartService } from '../services/CartService';

export class CartController {

  async getCart(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await cartService.getCart(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addItem(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { productId, quantity } = req.body;

      if (!productId || typeof quantity !== 'number') {
        res.status(400).json({ error: 'Invalid product or quantity' });
        return;
      }

      const result = await cartService.addItem(userId, Number(productId), quantity);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateItem(req: Request, res: Response) {
    try {
      const { userId, productId } = req.params;
      const { quantity } = req.body;

      if (typeof quantity !== 'number') {
        res.status(400).json({ error: 'Invalid quantity' });
        return;
      }

      const result = await cartService.updateItem(userId, Number(productId), quantity);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeItem(req: Request, res: Response) {
    try {
      const { userId, productId } = req.params;
      const result = await cartService.removeItem(userId, Number(productId));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async applyCoupon(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { code } = req.body;

      if (!code) {
        res.status(400).json({ error: 'Coupon code required' });
        return;
      }

      const result = await cartService.applyCoupon(userId, code);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeCoupon(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await cartService.removeCoupon(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
