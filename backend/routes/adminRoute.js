import express from 'express';
import { loginAdmin, appointmentsAdmin, appointmentCancel, addDoctor, allDoctors, adminDashboard, getDoctor, createAvailability, updateDoctor, getSettings, updateSettings } from '../controllers/adminController.js';
import { changeAvailablity } from '../controllers/doctorController.js';
import authAdmin from '../middleware/authAdmin.js';
import upload from '../middleware/multer.js';
const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin)
adminRouter.post("/add-doctor", authAdmin, upload.single('image'), addDoctor)
adminRouter.post('/update-doctor', authAdmin, upload.single('image'), updateDoctor)
adminRouter.get("/appointments", authAdmin, appointmentsAdmin)
adminRouter.post("/cancel-appointment", authAdmin, appointmentCancel)
adminRouter.get("/all-doctors", authAdmin, allDoctors)
adminRouter.get('/get-doctor/:id', authAdmin, getDoctor)
adminRouter.post("/change-availability", authAdmin, changeAvailablity)
adminRouter.post('/create-availability', authAdmin, createAvailability)
adminRouter.get("/dashboard", authAdmin, adminDashboard)
adminRouter.get('/settings', authAdmin, getSettings)
adminRouter.post('/settings', authAdmin, updateSettings)

export default adminRouter;