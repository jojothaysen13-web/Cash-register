import bcrypt from 'bcryptjs';
import { db } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';
import { signToken } from '../../utils/jwt';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: 'cashier' | 'admin';
  active: number;
}

export function login(username: string, password: string) {
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username) as UserRow | undefined;

  if (!user || !user.active || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Benutzername oder Passwort ist falsch.');
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    },
  };
}
