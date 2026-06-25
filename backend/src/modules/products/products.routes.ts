import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  createProduct,
  findByBarcode,
  listActive,
  listAll,
  searchByName,
  updateProduct,
} from './products.service';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const locationId = req.user!.locationId;
  res.json({ products: query ? searchByName(query, locationId) : listActive(locationId) });
});

router.get('/all', requireRole('admin'), (req, res, next) => {
  try {
    const locationId = z.coerce.number().int().positive().optional().parse(req.query.locationId) ?? null;
    res.json({ products: listAll(locationId) });
  } catch (err) {
    next(err);
  }
});

router.get('/barcode/:code', async (req, res, next) => {
  try {
    const product = await findByBarcode(req.params.code, req.user!.locationId);
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin'), (req, res, next) => {
  try {
    const schema = z.object({
      barcode: z.string().min(1),
      name: z.string().min(1),
      priceCents: z.number().int().nonnegative(),
      taxRate: z.number().nonnegative(),
      stockQty: z.number().int().nonnegative(),
      locationId: z.number().int().positive().optional(),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ product: createProduct(input) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('admin'), (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const schema = z.object({
      name: z.string().min(1).optional(),
      priceCents: z.number().int().nonnegative().optional(),
      taxRate: z.number().nonnegative().optional(),
      stockQty: z.number().int().nonnegative().optional(),
      locationId: z.number().int().positive().optional(),
      active: z.boolean().optional(),
    });
    const input = schema.parse(req.body);
    res.json({ product: updateProduct(id, input) });
  } catch (err) {
    next(err);
  }
});

export default router;
