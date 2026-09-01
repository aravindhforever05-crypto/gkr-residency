import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.get('/users', authenticate, authorize('SUPER_ADMIN', 'MANAGER'), authController.getUsers);
router.post('/users', authenticate, authorize('SUPER_ADMIN'), authController.createUser);
router.put('/users/:id', authenticate, authorize('SUPER_ADMIN'), authController.updateUser);
router.put('/change-password', authenticate, authController.changePassword);
router.get('/roles', authenticate, authController.getRoles);

export default router;
