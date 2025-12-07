import { Request, Response } from 'express';
import { prisma } from '../config/constants';

export class ProductController {
  
  async getAllProducts(req: Request, res: Response) {
    try {
      const products = await prisma.product.findMany({
        orderBy: {
          id: 'asc'
        }
      });
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await prisma.product.findUnique({
        where: { id: Number(id) }
      });

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}