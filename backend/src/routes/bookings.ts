import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, bookingController.getBookings);
router.get('/calendar', authenticate, bookingController.getCalendarView);
router.get('/:id', authenticate, bookingController.getBookingById);
router.post('/', authenticate, bookingController.createBooking);
router.put('/:id', authenticate, bookingController.updateBooking);
router.post('/:id/checkin', authenticate, bookingController.checkIn);
router.post('/:id/checkout', authenticate, bookingController.checkOut);
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);
router.post('/:id/extend', authenticate, bookingController.extendBooking);

export default router;
