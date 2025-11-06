import express from 'express';
import { loginAdmin, appointmentsAdmin, appointmentCancel, adminDashboard, addHoliday, getHolidays, removeHoliday } from '../controllers/adminController.js';
import authAdmin from '../middleware/authAdmin.js';
const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin)
adminRouter.get("/appointments", authAdmin, appointmentsAdmin)
adminRouter.post("/cancel-appointment", authAdmin, appointmentCancel)
adminRouter.get("/dashboard", authAdmin, adminDashboard)

// Holiday management routes
adminRouter.post('/add-holiday', authAdmin, addHoliday)
adminRouter.get('/holidays', authAdmin, getHolidays)
adminRouter.post('/remove-holiday', authAdmin, removeHoliday)

export default adminRouter;