import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import userModel from "../models/userModel.js";
import adminSettingsModel from "../models/adminSettingsModel.js";
import availabilityModel from '../models/availabilityModel.js';
import holidayModel from '../models/holidayModel.js';

// API for admin login
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get all appointments list
const appointmentsAdmin = async (req, res) => {
    try {
        const appointments = await appointmentModel.find({})
        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API for appointment cancellation
const appointmentCancel = async (req, res) => {
    try {
        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (appointmentData) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
            res.json({ success: true, message: 'Appointment Cancelled' })
        } else {
            res.json({ success: false, message: 'Appointment not found' })
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get dashboard data for admin panel
const adminDashboard = async (req, res) => {
    try {
        const appointments = await appointmentModel.find({}).sort({ date: -1 })
        
        // Get unique patients count
        const uniquePatients = await appointmentModel.distinct('patientMobile')
        
        // Get today's appointments
        const today = new Date()
        const todayKey = `${String(today.getDate()).padStart(2, '0')}_${String(today.getMonth() + 1).padStart(2, '0')}_${today.getFullYear()}`
        const todayAppointments = appointments.filter(apt => 
            apt.slotDate === todayKey && !apt.cancelled
        )

        const dashData = {
            appointments: appointments.length,
            patients: uniquePatients.length,
            todayAppointments: todayAppointments.length,
            latestAppointments: appointments.slice(0, 10)
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to add holiday
const addHoliday = async (req, res) => {
    try {
        const { date, name } = req.body

        if (!date || !name) {
            return res.json({ success: false, message: 'Date and name are required' })
        }

        const holiday = new holidayModel({
            date,
            name
        })

        await holiday.save()
        res.json({ success: true, message: 'Holiday added successfully' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get all holidays
const getHolidays = async (req, res) => {
    try {
        const holidays = await holidayModel.find({}).sort({ date: 1 })
        res.json({ success: true, holidays })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to remove holiday
const removeHoliday = async (req, res) => {
    try {
        const { holidayId } = req.body
        await holidayModel.findByIdAndDelete(holidayId)
        res.json({ success: true, message: 'Holiday removed successfully' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {
    loginAdmin,
    appointmentsAdmin,
    appointmentCancel,
    adminDashboard,
    addHoliday,
    getHolidays,
    removeHoliday
}
