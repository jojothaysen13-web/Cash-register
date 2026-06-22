import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from './env';

fs.mkdirSync(path.dirname(env.dbFile), { recursive: true });

export const db = new Database(env.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf-8');
db.exec(schema);

function ensureColumn(table: string, column: string, ddl: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

ensureColumn('sales', 'customer_id', 'customer_id INTEGER REFERENCES customers(id)');
ensureColumn('sales', 'points_earned', 'points_earned INTEGER NOT NULL DEFAULT 0');
ensureColumn('sales', 'points_redeemed', 'points_redeemed INTEGER NOT NULL DEFAULT 0');
ensureColumn('sales', 'loyalty_discount_cents', 'loyalty_discount_cents INTEGER NOT NULL DEFAULT 0');
ensureColumn('sale_items', 'returned_qty', 'returned_qty INTEGER NOT NULL DEFAULT 0');
