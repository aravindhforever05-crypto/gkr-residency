import { Router } from 'express';
import * as reportController from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, reportController.getDashboard);
router.get('/monthly', authenticate, reportController.getMonthlyReport);
router.get('/yearly', authenticate, reportController.getYearlyRevenue);
router.get('/occupancy', authenticate, reportController.getOccupancyReport);
router.get('/booking-sources', authenticate, reportController.getBookingSourceStats);
router.get('/audit-logs', authenticate, reportController.getAuditLogs);
router.get('/notifications', authenticate, reportController.getNotifications);
router.put('/notifications/:id/read', authenticate, reportController.markNotificationRead);

export default router;
