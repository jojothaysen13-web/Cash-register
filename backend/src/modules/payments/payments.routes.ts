import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import {
  cardPaymentsAreMocked,
  confirmMockCardIntent,
  createCardIntent,
  validateVoucher,
} from './payments.service';

const router = Router();

router.use(requireAuth);

router.post('/card/intent', async (req, res, next) => {
  try {
    const schema = z.object({ amountCents: z.number().int().positive() });
    const { amountCents } = schema.parse(req.body);
    const intent = await createCardIntent(amountCents);
    res.json(intent);
  } catch (err) {
    next(err);
  }
});

router.post('/card/confirm-mock', (req, res, next) => {
  try {
    if (!cardPaymentsAreMocked) {
      res.status(400).json({ error: 'Echtes Stripe-Konto aktiv, Mock-Endpoint nicht verfügbar.' });
      return;
    }
    const schema = z.object({
      paymentIntentId: z.string(),
      cardNumberLast4: z.string().length(4),
    });
    const { paymentIntentId, cardNumberLast4 } = schema.parse(req.body);
    res.json(confirmMockCardIntent(paymentIntentId, cardNumberLast4));
  } catch (err) {
    next(err);
  }
});

router.get('/voucher/:code', (req, res, next) => {
  try {
    const voucher = validateVoucher(req.params.code);
    res.json({ code: voucher.code, valueCents: voucher.value_cents });
  } catch (err) {
    next(err);
  }
});

router.get('/config', (_req, res) => {
  res.json({ cardPaymentsAreMocked });
});

export default router;
