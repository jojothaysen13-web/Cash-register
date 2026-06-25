import bcrypt from 'bcryptjs';
import { db } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';
import { getLocation } from '../locations/locations.service';

const SALT_ROUNDS = 10;

export interface UserSummary {
  id: number;
  username: string;
  full_name: string;
  role: 'cashier' | 'admin';
  active: number;
  created_at: string;
  location_id: number | null;
  location_name: string | null;
}

const SUMMARY_SELECT = `
  SELECT u.id, u.username, u.full_name, u.role, u.active, u.created_at, u.location_id, l.name AS location_name
  FROM users u LEFT JOIN locations l ON l.id = u.location_id
`;

export function listUsers(): UserSummary[] {
  return db.prepare(`${SUMMARY_SELECT} ORDER BY u.username`).all() as UserSummary[];
}

export function createUser(
  username: string,
  password: string,
  fullName: string,
  role: 'cashier' | 'admin',
  locationId: number | null
): UserSummary {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (exists) {
    throw new HttpError(409, 'Benutzername bereits vergeben.');
  }
  if (role === 'cashier' && !locationId) {
    throw new HttpError(400, 'Kassierer benötigen einen Standort.');
  }
  if (locationId) {
    getLocation(locationId); // wirft 404, falls der Standort nicht existiert
  }
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO users (username, password_hash, full_name, role, location_id) VALUES (?, ?, ?, ?, ?)'
    )
    .run(username.trim(), passwordHash, fullName.trim(), role, locationId ?? null);
  return db.prepare(`${SUMMARY_SELECT} WHERE u.id = ?`).get(lastInsertRowid) as UserSummary;
}

export function setUserActive(userId: number, active: boolean): UserSummary {
  const result = db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, userId);
  if (result.changes === 0) {
    throw new HttpError(404, 'Benutzer nicht gefunden.');
  }
  return db.prepare(`${SUMMARY_SELECT} WHERE u.id = ?`).get(userId) as UserSummary;
}
