import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from './env';

fs.mkdirSync(path.dirname(env.dbFile), { recursive: true });

export const db = new Database(env.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// schema.sql wird von tsc nicht nach dist/ kopiert. Wir suchen daher an mehreren
// Stellen, damit es sowohl im Dev-Modus (tsx, src/) als auch im Production-Build
// (node dist/, mit Fallback auf src/) gefunden wird.
const schemaCandidates = [
  path.join(__dirname, '..', 'db', 'schema.sql'),
  path.resolve(__dirname, '..', '..', 'src', 'db', 'schema.sql'),
];
const schemaPath = schemaCandidates.find((candidate) => fs.existsSync(candidate));
if (!schemaPath) {
  throw new Error(`schema.sql nicht gefunden (gesucht: ${schemaCandidates.join(', ')})`);
}
const schema = fs.readFileSync(schemaPath, 'utf-8');
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
