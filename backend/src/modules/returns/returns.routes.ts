import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { createReturn } from './returns.service';

const router = Router();

router.use(requireAuth);

const createReturnSchema = z.object({
  saleId: z.number().int().positive(),
  items: z
    .array(z.object({ saleItemId: z.number().int().positive(), qty: z.number().int().positive() }))
    .min(1),
  refundMethod: z.enum(['cash', 'card', 'voucher_credit']),
});

router.post('/', async (req, res, next) => {
  try {
    const { saleId, items, refundMethod } = createReturnSchema.parse(req.body);
    const result = await createReturn(req.user!.userId, saleId, items, refundMethod);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
