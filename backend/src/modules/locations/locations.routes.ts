import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { createLocation, listLocations, setLocationActive } from './locations.service';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', (_req, res) => {
  res.json({ locations: listLocations() });
});

router.post('/', (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      code: z.string().min(1),
    });
    const { name, code } = schema.parse(req.body);
    res.status(201).json({ location: createLocation(name, code) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/active', (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    res.json({ location: setLocationActive(id, active) });
  } catch (err) {
    next(err);
  }
});

export default router;
