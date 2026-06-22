import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { findByBarcode, listActive, searchByName } from './products.service';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  res.json({ products: query ? searchByName(query) : listActive() });
});

router.get('/barcode/:code', async (req, res, next) => {
  try {
    const product = await findByBarcode(req.params.code);
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

export default router;
