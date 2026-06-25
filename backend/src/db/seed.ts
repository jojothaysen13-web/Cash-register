import bcrypt from 'bcryptjs';
import { db } from '../config/db';

const SALT_ROUNDS = 10;

function upsertLocation(name: string, code: string): number {
  const existing = db.prepare('SELECT id FROM locations WHERE code = ?').get(code) as
    | { id: number }
    | undefined;
  if (existing) return existing.id;
  const { lastInsertRowid } = db
    .prepare('INSERT INTO locations (name, code) VALUES (?, ?)')
    .run(name, code);
  return Number(lastInsertRowid);
}

const locationFiliale1 = upsertLocation('Filiale Mitte', 'FIL-1');
const locationFiliale2 = upsertLocation('Filiale Nord', 'FIL-2');

function upsertUser(
  username: string,
  password: string,
  fullName: string,
  role: 'cashier' | 'admin',
  locationId: number | null
) {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return;
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role, location_id) VALUES (?, ?, ?, ?, ?)'
  ).run(username, passwordHash, fullName, role, locationId);
}

upsertUser('kassierer', 'kassierer123', 'Anna Kassiererin', 'cashier', locationFiliale1);
upsertUser('kassierer2', 'kassierer123', 'Tom Thalberg', 'cashier', locationFiliale2);
upsertUser('admin', 'admin123', 'Max Administrator', 'admin', null);

const products: Array<[string, string, number, number, number]> = [
  ['4006381333931', 'Tafel Schokolade Vollmilch', 129, 7.0, 50],
  ['4000417025005', 'Gummibärchen 200g', 199, 7.0, 40],
  ['4311501131312', 'Mineralwasser 1L', 89, 19.0, 100],
  ['4008400122017', 'Spülmittel 500ml', 219, 19.0, 30],
  ['4066600204577', 'Kugelschreiber Blau', 99, 19.0, 60],
  ['4001724819312', 'Müsliriegel Schoko', 59, 7.0, 80],
  ['4104420105537', 'Toastbrot 500g', 179, 7.0, 25],
  ['4087600314423', 'Zahnpasta Frisch 75ml', 249, 19.0, 35],
  ['4099100119307', 'Orangensaft 1L', 159, 7.0, 45],
  ['4250017005006', 'Notizblock A5', 299, 19.0, 20],
];

const insertProduct = db.prepare(
  `INSERT INTO products (barcode, name, price_cents, tax_rate, stock_qty)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(barcode) DO NOTHING`
);

const findProductId = db.prepare('SELECT id FROM products WHERE barcode = ?');

const upsertStock = db.prepare(
  `INSERT INTO product_stock (product_id, location_id, qty_on_hand) VALUES (?, ?, ?)
   ON CONFLICT(product_id, location_id) DO NOTHING`
);

for (const [barcode, name, priceCents, taxRate, stock] of products) {
  insertProduct.run(barcode, name, priceCents, taxRate, stock);
  const product = findProductId.get(barcode) as { id: number } | undefined;
  if (!product) continue;
  // Filiale Mitte bekommt den vollen Demo-Bestand, Filiale Nord eine kleinere
  // eigene Menge — so lässt sich "vollständig getrennter" Standortbestand sofort sehen.
  upsertStock.run(product.id, locationFiliale1, stock);
  upsertStock.run(product.id, locationFiliale2, Math.max(0, Math.round(stock * 0.4)));
}

const vouchers: Array<[string, number]> = [
  ['GUTSCHEIN10', 1000],
  ['GUTSCHEIN25', 2500],
];

const insertVoucher = db.prepare(
  `INSERT INTO vouchers (code, value_cents) VALUES (?, ?) ON CONFLICT(code) DO NOTHING`
);

for (const [code, valueCents] of vouchers) {
  insertVoucher.run(code, valueCents);
}

const customers: Array<[string, string, string | null, number]> = [
  ['1001', 'Erika Musterfrau', '0170-1234567', 35],
  ['1002', 'Hans Beispiel', null, 0],
];

const insertCustomer = db.prepare(
  `INSERT INTO customers (card_number, full_name, phone, points_balance)
   VALUES (?, ?, ?, ?)
   ON CONFLICT(card_number) DO NOTHING`
);

for (const [cardNumber, fullName, phone, points] of customers) {
  insertCustomer.run(cardNumber, fullName, phone, points);
}

console.log('Seed complete:');
console.log('  Login Kassierer (Filiale Mitte) -> username: kassierer,  password: kassierer123');
console.log('  Login Kassierer (Filiale Nord)  -> username: kassierer2, password: kassierer123');
console.log('  Login Admin                     -> username: admin,      password: admin123');
console.log(
  `  2 Standorte, ${products.length} Produkte (je Standort eigener Bestand), ${vouchers.length} Gutscheine, ${customers.length} Kunden angelegt.`
);
