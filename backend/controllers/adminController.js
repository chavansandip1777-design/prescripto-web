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
import slotModel from '../models/slotModel.js';

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

// API to get all slots
const getAllSlots = async (req, res) => {
    try {
        const { date } = req.query
        let query = {}

        if (date) {
            query.date = date
        }

        const slots = await slotModel.find(query).sort({ date: 1, time: 1 })

        // Get booking counts for each slot
        const slotsWithBookings = await Promise.all(slots.map(async (slot) => {
            const bookingCount = await appointmentModel.countDocuments({
                slotDate: slot.date,
                slotTime: slot.time,
                cancelled: false
            })

            return {
                _id: slot._id,
                date: slot.date,
                time: slot.time,
                maxSeats: slot.maxSeats,
                isEnabled: slot.isEnabled,
                bookedSeats: bookingCount,
                availableSeats: slot.maxSeats - bookingCount,
                createdAt: slot.createdAt,
                updatedAt: slot.updatedAt
            }
        }))

        res.json({ success: true, slots: slotsWithBookings })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to create new slot
const createSlot = async (req, res) => {
    try {
        const { date, time, maxSeats } = req.body

        if (!date || !time) {
            return res.json({ success: false, message: 'Date and time are required' })
        }

        // Check if slot already exists
        const existingSlot = await slotModel.findOne({ date, time })
        if (existingSlot) {
            return res.json({ success: false, message: 'Slot already exists for this date and time' })
        }

        const newSlot = new slotModel({
            date,
            time,
            maxSeats: maxSeats || 1,
            isEnabled: true
        })

        await newSlot.save()
        res.json({ success: true, message: 'Slot created successfully', slot: newSlot })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update slot
const updateSlot = async (req, res) => {
    try {
        const { slotId, maxSeats, isEnabled } = req.body

        if (!slotId) {
            return res.json({ success: false, message: 'Slot ID is required' })
        }

        const slot = await slotModel.findById(slotId)
        if (!slot) {
            return res.json({ success: false, message: 'Slot not found' })
        }

        // Check if reducing seats below current bookings
        if (maxSeats !== undefined) {
            const bookingCount = await appointmentModel.countDocuments({
                slotDate: slot.date,
                slotTime: slot.time,
                cancelled: false
            })

            if (maxSeats < bookingCount) {
                return res.json({
                    success: false,
                    message: `Cannot reduce seats below current bookings (${bookingCount})`
                })
            }

            slot.maxSeats = maxSeats
        }

        if (isEnabled !== undefined) {
            slot.isEnabled = isEnabled
        }

        slot.updatedAt = Date.now()
        await slot.save()

        res.json({ success: true, message: 'Slot updated successfully', slot })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to delete slot
const deleteSlot = async (req, res) => {
    try {
        const { slotId } = req.body

        if (!slotId) {
            return res.json({ success: false, message: 'Slot ID is required' })
        }

        const slot = await slotModel.findById(slotId)
        if (!slot) {
            return res.json({ success: false, message: 'Slot not found' })
        }

        // Check if slot has bookings
        const bookingCount = await appointmentModel.countDocuments({
            slotDate: slot.date,
            slotTime: slot.time,
            cancelled: false
        })

        if (bookingCount > 0) {
            return res.json({
                success: false,
                message: `Cannot delete slot with existing bookings (${bookingCount}). Please disable it instead.`
            })
        }

        await slotModel.findByIdAndDelete(slotId)
        res.json({ success: true, message: 'Slot deleted successfully' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to bulk create slots for a date range
const bulkCreateSlots = async (req, res) => {
    try {
        const { startDate, endDate, startTime, endTime, slotDuration, seatsPerSlot, skipWeekends } = req.body

        if (!startDate || !endDate || !startTime || !endTime) {
            return res.json({ success: false, message: 'All date and time fields are required' })
        }

        const duration = slotDuration || 30
        const seats = seatsPerSlot || 1

        // Parse dates - handle both DD_MM_YYYY and YYYY-MM-DD formats
        let start, end

        if (startDate.includes('-')) {
            // YYYY-MM-DD format - parse to avoid timezone issues
            const [sy, sm, sd] = startDate.split('-').map(Number)
            const [ey, em, ed] = endDate.split('-').map(Number)
            start = new Date(sy, sm - 1, sd)
            end = new Date(ey, em - 1, ed)
        } else {
            // DD_MM_YYYY format
            const [sd, sm, sy] = startDate.split('_').map(Number)
            const [ed, em, ey] = endDate.split('_').map(Number)
            start = new Date(sy, sm - 1, sd)
            end = new Date(ey, em - 1, ed)
        }

        // Determine if this is a single day (allow weekends) or range (respect skipWeekends)
        const isSingleDay = start.getTime() === end.getTime()
        const shouldSkipWeekends = !isSingleDay && skipWeekends !== false

        // Parse times - handle both "10:00 AM" and "10:00" formats
        let startHour, startMin, endHour, endMin

        if (startTime.includes('AM') || startTime.includes('PM')) {
            // 12-hour format
            const [startTimeOnly, startPeriod] = startTime.split(' ')
            const [sH, sM] = startTimeOnly.split(':').map(Number)
            startHour = startPeriod === 'PM' && sH !== 12 ? sH + 12 : startPeriod === 'AM' && sH === 12 ? 0 : sH
            startMin = sM || 0

            const [endTimeOnly, endPeriod] = endTime.split(' ')
            const [eH, eM] = endTimeOnly.split(':').map(Number)
            endHour = endPeriod === 'PM' && eH !== 12 ? eH + 12 : endPeriod === 'AM' && eH === 12 ? 0 : eH
            endMin = eM || 0
        } else {
            // 24-hour format
            const [sH, sM] = startTime.split(':').map(Number)
            const [eH, eM] = endTime.split(':').map(Number)
            startHour = sH
            startMin = sM || 0
            endHour = eH
            endMin = eM || 0
        }

        const slotsCreated = []
        const slotsSkipped = []
        let datesProcessed = 0
        let datesSkippedWeekend = 0
        let datesSkippedHoliday = 0

        // Loop through each date
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            datesProcessed++
            const dayOfWeek = d.getDay()

            // Skip weekends only if it's a date range AND skipWeekends is true
            if (shouldSkipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
                datesSkippedWeekend++
                continue
            }

            const dateKey = `${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}_${d.getFullYear()}`

            // Check if it's a holiday
            const isHoliday = await holidayModel.findOne({ date: dateKey })
            if (isHoliday) {
                datesSkippedHoliday++
                continue
            }

            // Generate time slots for this date
            let currentMinutes = startHour * 60 + startMin
            const endMinutes = endHour * 60 + endMin

            while (currentMinutes < endMinutes) {
                const hour = Math.floor(currentMinutes / 60)
                const min = currentMinutes % 60
                const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                const period = hour >= 12 ? 'PM' : 'AM'
                const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`

                // Check if slot exists
                const existingSlot = await slotModel.findOne({ date: dateKey, time: timeStr })

                if (!existingSlot) {
                    const newSlot = new slotModel({
                        date: dateKey,
                        time: timeStr,
                        maxSeats: seats,
                        isEnabled: true
                    })
                    await newSlot.save()
                    slotsCreated.push({ date: dateKey, time: timeStr })
                } else {
                    slotsSkipped.push({ date: dateKey, time: timeStr })
                }

                currentMinutes += duration
            }
        }

        res.json({
            success: true,
            message: `Created ${slotsCreated.length} slots, skipped ${slotsSkipped.length} existing slots (${datesProcessed} dates processed, ${datesSkippedWeekend} weekends skipped, ${datesSkippedHoliday} holidays skipped)`,
            slotsCreated: slotsCreated.length,
            slotsSkipped: slotsSkipped.length,
            debug: {
                datesProcessed,
                datesSkippedWeekend,
                datesSkippedHoliday,
                isSingleDay,
                shouldSkipWeekends
            }
        })
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
    removeHoliday,
    getAllSlots,
    createSlot,
    updateSlot,
    deleteSlot,
    bulkCreateSlots
}
