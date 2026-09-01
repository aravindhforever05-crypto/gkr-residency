import { Router } from 'express';
import * as customerController from '../controllers/customerController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, customerController.getCustomers);
router.get('/:id', authenticate, customerController.getCustomerById);
router.post('/', authenticate, customerController.createCustomer);
router.put('/:id', authenticate, customerController.updateCustomer);

export default router;
