import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { HttpError } from '../../middleware/errorHandler';
import { createUser, listUsers, setUserActive } from './users.service';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', (_req, res) => {
  res.json({ users: listUsers() });
});

router.post('/', (req, res, next) => {
  try {
    const schema = z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      fullName: z.string().min(1),
      role: z.enum(['cashier', 'admin']),
      locationId: z.number().int().positive().nullable().optional(),
    });
    const { username, password, fullName, role, locationId } = schema.parse(req.body);
    res.status(201).json({ user: createUser(username, password, fullName, role, locationId ?? null) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/active', (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    if (id === req.user!.userId) {
      throw new HttpError(400, 'Du kannst dich nicht selbst deaktivieren.');
    }
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    res.json({ user: setUserActive(id, active) });
  } catch (err) {
    next(err);
  }
});

export default router;
