import express from 'express';
import { getAvailability, bookAppointment, cancelAppointment, getUserAppointments } from '../controllers/bookingController.js';

const bookingRouter = express.Router();

// Get availability for booking calendar
bookingRouter.get('/availability', getAvailability);

// Book an appointment
bookingRouter.post('/book', bookAppointment);

// Cancel appointment
bookingRouter.post('/cancel', cancelAppointment);

// Get user appointments for cancellation lookup
bookingRouter.get('/user-appointments', getUserAppointments);

export default bookingRouter;