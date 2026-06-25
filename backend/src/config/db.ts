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
ensureColumn('users', 'location_id', 'location_id INTEGER REFERENCES locations(id)');
ensureColumn('sales', 'location_id', 'location_id INTEGER REFERENCES locations(id)');
ensureColumn('day_closings', 'location_id', 'location_id INTEGER REFERENCES locations(id)');
ensureColumn('returns', 'location_id', 'location_id INTEGER REFERENCES locations(id)');

// SQLite kann CHECK-Constraints nicht per ALTER TABLE ändern. Für Bestandsdatenbanken
// (vor Phase 3 angelegt) wird sale_payments daher einmalig neu aufgebaut, damit
// method = 'mobile' (neue Zahlart Mobile/Wallet) zulässig ist. Bei frischen DBs greift
// bereits die CHECK-Klausel aus schema.sql, sodass dieser Block dann ein No-Op ist.
const salePaymentsTableSql = (
  db.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sale_payments'`).get() as
    | { sql: string }
    | undefined
)?.sql;
if (salePaymentsTableSql && !salePaymentsTableSql.includes("'mobile'")) {
  db.exec(`
    BEGIN TRANSACTION;
    ALTER TABLE sale_payments RENAME TO sale_payments_old;
    CREATE TABLE sale_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'voucher', 'mobile')),
      amount_cents INTEGER NOT NULL,
      tendered_cents INTEGER,
      change_cents INTEGER,
      reference TEXT
    );
    INSERT INTO sale_payments (id, sale_id, method, amount_cents, tendered_cents, change_cents, reference)
      SELECT id, sale_id, method, amount_cents, tendered_cents, change_cents, reference FROM sale_payments_old;
    DROP TABLE sale_payments_old;
    CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);
    COMMIT;
  `);
}
