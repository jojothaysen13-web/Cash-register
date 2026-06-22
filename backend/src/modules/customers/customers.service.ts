import { db } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';

export interface Customer {
  id: number;
  card_number: string;
  full_name: string;
  phone: string | null;
  points_balance: number;
  created_at: string;
}

export function listCustomers(): Customer[] {
  return db.prepare('SELECT * FROM customers ORDER BY full_name').all() as Customer[];
}

export function findByCardNumber(cardNumber: string): Customer {
  const customer = db
    .prepare('SELECT * FROM customers WHERE card_number = ?')
    .get(cardNumber.trim()) as Customer | undefined;
  if (!customer) {
    throw new HttpError(404, 'Kein Kunde mit dieser Kartennummer gefunden.');
  }
  return customer;
}

export function createCustomer(cardNumber: string, fullName: string, phone: string | null): Customer {
  const exists = db.prepare('SELECT id FROM customers WHERE card_number = ?').get(cardNumber.trim());
  if (exists) {
    throw new HttpError(409, 'Kartennummer wird bereits verwendet.');
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO customers (card_number, full_name, phone) VALUES (?, ?, ?)')
    .run(cardNumber.trim(), fullName.trim(), phone?.trim() || null);
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(lastInsertRowid) as Customer;
}
