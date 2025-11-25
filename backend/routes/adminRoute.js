import express from 'express';
import {
    loginAdmin,
    appointmentsAdmin,
    appointmentCancel,
    adminDashboard,
    addHoliday,
    getHolidays,
    removeHoliday,
    getAllSlots,
    createSlot,
    updateSlot,
    deleteSlot,
    bulkCreateSlots
} from '../controllers/adminController.js';
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

// Slot management routes
adminRouter.get('/slots', authAdmin, getAllSlots)
adminRouter.post('/create-slot', authAdmin, createSlot)
adminRouter.post('/update-slot', authAdmin, updateSlot)
adminRouter.post('/delete-slot', authAdmin, deleteSlot)
adminRouter.post('/bulk-create-slots', authAdmin, bulkCreateSlots)

export default adminRouter;