import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }
  try {
    req.user = verifyToken(header.slice('Bearer '.length));
    next();
  } catch {
    res.status(401).json({ error: 'Sitzung abgelaufen oder ungültig.' });
  }
}

export function requireRole(...roles: Array<'cashier' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Keine Berechtigung für diese Aktion.' });
      return;
    }
    next();
  };
}
