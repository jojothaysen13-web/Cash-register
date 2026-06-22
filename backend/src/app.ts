import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import './config/db';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import closingRoutes from './modules/closing/closing.routes';
import customersRoutes from './modules/customers/customers.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import productsRoutes from './modules/products/products.routes';
import reportsRoutes from './modules/reports/reports.routes';
import returnsRoutes from './modules/returns/returns.routes';
import salesRoutes from './modules/sales/sales.routes';
import usersRoutes from './modules/users/users.routes';

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/closing', closingRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);

app.use(errorHandler);
