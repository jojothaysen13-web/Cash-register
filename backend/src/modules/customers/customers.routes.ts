import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { createCustomer, findByCardNumber, listCustomers } from './customers.service';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('admin'), (_req, res) => {
  res.json({ customers: listCustomers() });
});

router.get('/card/:cardNumber', (req, res, next) => {
  try {
    res.json({ customer: findByCardNumber(req.params.cardNumber) });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin'), (req, res, next) => {
  try {
    const schema = z.object({
      cardNumber: z.string().min(3),
      fullName: z.string().min(1),
      phone: z.string().optional(),
    });
    const { cardNumber, fullName, phone } = schema.parse(req.body);
    res.status(201).json({ customer: createCustomer(cardNumber, fullName, phone ?? null) });
  } catch (err) {
    next(err);
  }
});

export default router;
