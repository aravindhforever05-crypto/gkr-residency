import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, paymentController.getPayments);
router.get('/pending', authenticate, paymentController.getPendingPayments);
router.post('/', authenticate, paymentController.addPayment);

export default router;
