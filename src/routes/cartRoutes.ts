import { Router } from 'express';
import { CartController } from '../controllers/CartController';

const router = Router();
const cartController = new CartController();

// Cart routes
router.get('/:userId', (req, res) => cartController.getCart(req, res));
router.post('/:userId/item', (req, res) => cartController.addItem(req, res));
router.put('/:userId/item/:productId', (req, res) => cartController.updateItem(req, res));
router.delete('/:userId/item/:productId', (req, res) => cartController.removeItem(req, res));

// Coupon routes
router.post('/:userId/coupon/apply', (req, res) => cartController.applyCoupon(req, res));
router.post('/:userId/coupon/remove', (req, res) => cartController.removeCoupon(req, res));

export default router;
