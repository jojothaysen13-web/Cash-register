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
  location_id: number | null;
  location_name: string | null;
}

export function login(username: string, password: string) {
  const user = db
    .prepare(
      `SELECT u.id, u.username, u.password_hash, u.full_name, u.role, u.active, u.location_id, l.name AS location_name
       FROM users u LEFT JOIN locations l ON l.id = u.location_id
       WHERE u.username = ?`
    )
    .get(username) as UserRow | undefined;

  if (!user || !user.active || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Benutzername oder Passwort ist falsch.');
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    locationId: user.location_id,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      locationId: user.location_id,
      locationName: user.location_name,
    },
  };
}
