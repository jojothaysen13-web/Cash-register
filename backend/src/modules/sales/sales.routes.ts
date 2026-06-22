import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { createSale, getSaleById } from './sales.service';

const router = Router();

router.use(requireAuth);

const paymentSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('cash'), tenderedCents: z.number().int().nonnegative() }),
  z.object({ method: z.literal('card'), paymentIntentId: z.string() }),
  z.object({ method: z.literal('voucher'), code: z.string() }),
]);

const createSaleSchema = z.object({
  items: z
    .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().positive() }))
    .min(1),
  payment: paymentSchema,
  customerId: z.number().int().positive().optional(),
  redeemPoints: z.number().int().nonnegative().optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const { items, payment, customerId, redeemPoints } = createSaleSchema.parse(req.body);
    const result = await createSale(req.user!.userId, items, payment, { customerId, redeemPoints });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const saleId = z.coerce.number().int().positive().parse(req.params.id);
    res.json(getSaleById(saleId));
  } catch (err) {
    next(err);
  }
});

export default router;
