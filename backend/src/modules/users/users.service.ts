import bcrypt from 'bcryptjs';
import { db } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';

const SALT_ROUNDS = 10;

export interface UserSummary {
  id: number;
  username: string;
  full_name: string;
  role: 'cashier' | 'admin';
  active: number;
  created_at: string;
}

const SUMMARY_COLUMNS = 'id, username, full_name, role, active, created_at';

export function listUsers(): UserSummary[] {
  return db.prepare(`SELECT ${SUMMARY_COLUMNS} FROM users ORDER BY username`).all() as UserSummary[];
}

export function createUser(
  username: string,
  password: string,
  fullName: string,
  role: 'cashier' | 'admin'
): UserSummary {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (exists) {
    throw new HttpError(409, 'Benutzername bereits vergeben.');
  }
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
    .run(username.trim(), passwordHash, fullName.trim(), role);
  return db
    .prepare(`SELECT ${SUMMARY_COLUMNS} FROM users WHERE id = ?`)
    .get(lastInsertRowid) as UserSummary;
}

export function setUserActive(userId: number, active: boolean): UserSummary {
  const result = db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, userId);
  if (result.changes === 0) {
    throw new HttpError(404, 'Benutzer nicht gefunden.');
  }
  return db.prepare(`SELECT ${SUMMARY_COLUMNS} FROM users WHERE id = ?`).get(userId) as UserSummary;
}
