import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { login } from './auth.service';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Benutzername und Passwort werden benötigt.' });
    return;
  }
  const result = login(parsed.data.username, parsed.data.password);
  res.json(result);
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
