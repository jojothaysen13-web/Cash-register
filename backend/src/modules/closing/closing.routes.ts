import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { closeDay, getSummary } from './closing.service';

const router = Router();

router.use(requireAuth);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

router.get('/summary', (req, res, next) => {
  try {
    const businessDate = dateSchema.parse(req.query.date ?? new Date().toISOString().slice(0, 10));
    res.json(getSummary(req.user!.userId, businessDate));
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const schema = z.object({
      businessDate: dateSchema,
      countedCashCents: z.number().int().nonnegative(),
    });
    const { businessDate, countedCashCents } = schema.parse(req.body);
    const result = closeDay(req.user!.userId, req.user!.locationId, businessDate, countedCashCents);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
