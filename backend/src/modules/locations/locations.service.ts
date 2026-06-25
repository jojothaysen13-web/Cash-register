import { db } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';

export interface Location {
  id: number;
  name: string;
  code: string;
  active: number;
  created_at: string;
}

const COLUMNS = 'id, name, code, active, created_at';

export function listLocations(): Location[] {
  return db.prepare(`SELECT ${COLUMNS} FROM locations ORDER BY name`).all() as Location[];
}

export function listActiveLocations(): Location[] {
  return db
    .prepare(`SELECT ${COLUMNS} FROM locations WHERE active = 1 ORDER BY name`)
    .all() as Location[];
}

export function getLocation(id: number): Location {
  const location = db.prepare(`SELECT ${COLUMNS} FROM locations WHERE id = ?`).get(id) as
    | Location
    | undefined;
  if (!location) {
    throw new HttpError(404, 'Standort nicht gefunden.');
  }
  return location;
}

export function createLocation(name: string, code: string): Location {
  const exists = db.prepare('SELECT id FROM locations WHERE code = ?').get(code.trim());
  if (exists) {
    throw new HttpError(409, 'Standort-Code bereits vergeben.');
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO locations (name, code) VALUES (?, ?)')
    .run(name.trim(), code.trim());
  return db.prepare(`SELECT ${COLUMNS} FROM locations WHERE id = ?`).get(lastInsertRowid) as Location;
}

export function setLocationActive(id: number, active: boolean): Location {
  const result = db.prepare('UPDATE locations SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  if (result.changes === 0) {
    throw new HttpError(404, 'Standort nicht gefunden.');
  }
  return db.prepare(`SELECT ${COLUMNS} FROM locations WHERE id = ?`).get(id) as Location;
}
