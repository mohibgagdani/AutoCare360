import { Router } from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/enums.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import vehicleRoutes from './vehicleRoutes.js';
import maintenanceRoutes from './maintenanceRoutes.js';
import adminRoutes from './adminRoutes.js';
import {
  serviceRecordRouter,
  expenseRouter,
  reminderRouter,
  documentRouter,
  notificationRouter,
} from './recordRoutes.js';
import { getMeta } from '../controllers/metaController.js';
import * as insights from '../controllers/insightsController.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    },
  })
);

router.use('/auth', authRoutes);

// Everything below requires a signed-in user.
router.use(protect);
router.get('/meta', getMeta);
router.use('/users', userRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/service-records', serviceRecordRouter);
router.use('/expenses', expenseRouter);
router.use('/reminders', reminderRouter);
router.use('/documents', documentRouter);
router.use('/notifications', notificationRouter);
router.get('/dashboard', insights.dashboard);
router.get('/search', insights.search);
router.get('/exports/service-records', insights.exportServices);
router.get('/exports/expenses', insights.exportExpenseList);
router.get('/exports/maintenance', insights.exportMaintenanceList);
router.get('/exports/vehicles/:id/report', insights.vehicleReport);

router.use('/admin', authorize(ROLES.ADMIN), adminRoutes);

export default router;
