import { Decimal } from '@prisma/client/runtime/library';

export interface CartTotal {
  subtotalCents: number;
  discountCents: number;
  finalTotalCents: number;
  appliedCouponCode: string | null;
}

export interface CartItemData {
  productId: number;
  quantity: number;
  name: string;
  priceCents: number;
  totalCents: number;
}

export interface CartResponse {
  items: CartItemData[];
  totals: CartTotal;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}
