import { Router } from 'express';
import * as roomController from '../controllers/roomController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, roomController.getRooms);
router.get('/availability', authenticate, roomController.checkAvailability);
router.get('/performance', authenticate, roomController.getRoomPerformance);
router.get('/floors', authenticate, roomController.getFloors);
router.get('/:id', authenticate, roomController.getRoomById);
router.put('/:id/status', authenticate, roomController.updateRoomStatus);
router.put('/:id', authenticate, roomController.updateRoom);

export default router;
