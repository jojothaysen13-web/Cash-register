import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { getReport } from './reports.service';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', (req, res, next) => {
  try {
    const schema = z.object({
      range: z.enum(['day', 'week', 'month']).default('day'),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .default(new Date().toISOString().slice(0, 10)),
    });
    const { range, date } = schema.parse(req.query);
    res.json(getReport(range, date));
  } catch (err) {
    next(err);
  }
});

export default router;
