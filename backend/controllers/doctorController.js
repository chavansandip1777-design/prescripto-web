import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import adminSettingsModel from "../models/adminSettingsModel.js";
import availabilityModel from '../models/availabilityModel.js'

// API for doctor Login 
const loginDoctor = async (req, res) => {

    try {

        const { email, password } = req.body
        const user = await doctorModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
    try {

        const { docId } = req.body
        const appointments = await appointmentModel.find({ docId })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to cancel appointment for doctor panel
const appointmentCancel = async (req, res) => {
    try {

        const { docId, appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
            return res.json({ success: true, message: 'Appointment Cancelled' })
        }

        res.json({ success: false, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to mark appointment completed for doctor panel
const appointmentComplete = async (req, res) => {
    try {

        const { docId, appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true })
            return res.json({ success: true, message: 'Appointment Completed' })
        }

        res.json({ success: false, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to get all doctors list for Frontend
const doctorList = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select(['-password', '-email'])
        res.json({ success: true, doctors })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to change doctor availablity for Admin and Doctor Panel
const changeAvailablity = async (req, res) => {
    try {

        const { docId } = req.body

        const docData = await doctorModel.findById(docId)
        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
        res.json({ success: true, message: 'Availablity Changed' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get doctor profile for  Doctor Panel
const doctorProfile = async (req, res) => {
    try {

        const { docId } = req.body
        const profileData = await doctorModel.findById(docId).select('-password')

        res.json({ success: true, profileData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update doctor profile data from  Doctor Panel
const updateDoctorProfile = async (req, res) => {
    try {

        const { docId, fees, address, available } = req.body

        await doctorModel.findByIdAndUpdate(docId, { fees, address, available })

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
    try {

        const { docId } = req.body

        const appointments = await appointmentModel.find({ docId })

        let earnings = 0

        appointments.map((item) => {
            if (item.isCompleted || item.payment) {
                earnings += item.amount
            }
        })

        let patients = []

        appointments.map((item) => {
            if (!patients.includes(item.userId)) {
                patients.push(item.userId)
            }
        })



        const dashData = {
            earnings,
            appointments: appointments.length,
            patients: patients.length,
            latestAppointments: appointments.reverse()
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get availability for a doctor for next N days (from availabilityModel)
const getAvailability = async (req, res) => {
    try {
        const { docId } = req.body
        const doc = await doctorModel.findById(docId).select('-password')
        if (!doc) return res.json({ success: false, message: 'Doctor not found' })

        // find availability entries for doc for today and future
        const today = new Date()
        const availEntries = await availabilityModel.find({ docId })

        const result = []

        for (const entry of availEntries) {
            // parse entry.date (supports DD_MM_YYYY or ISO string)
            let dateObj
            if (typeof entry.date === 'string' && (entry.date.includes('T') || entry.date.includes('-'))) {
                const maybe = new Date(entry.date)
                if (isNaN(maybe)) continue
                dateObj = maybe
            } else if (typeof entry.date === 'string' && entry.date.includes('_')) {
                const parts = entry.date.split('_').map(Number)
                dateObj = new Date(parts[2], parts[1] - 1, parts[0])
            } else {
                // unknown format, skip
                continue
            }
            if (dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate())) continue

            const slots = []

            const slotDuration = entry.slotDurationMinutes

            let cursor = new Date(dateObj)
            cursor.setHours(entry.startHour, 0, 0, 0)
            const endTime = new Date(dateObj)
            endTime.setHours(entry.endHour, 0, 0, 0)

            // compute number of slots for the day
            const slotsTimes = []
            while (cursor < endTime) {
                slotsTimes.push(new Date(cursor))
                cursor = new Date(cursor.getTime() + slotDuration * 60 * 1000)
            }

            const S = slotsTimes.length
            // distribute totalSlots across S slots: base seats each and distribute remainder to earliest slots
            const totalSeats = Number(entry.totalSlots) || 0
            const base = S > 0 ? Math.floor(totalSeats / S) : 0
            let remainder = S > 0 ? totalSeats % S : 0

            // build canonical date key for this entry (DD_MM_YYYY)
            const dateKey = `${dateObj.getDate()}_${dateObj.getMonth() + 1}_${dateObj.getFullYear()}`

            // stable time formatter used across API - ensures consistent comparison with booking endpoint
            const formatTime = (dt) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(dt).toLowerCase()

            for (let i = 0; i < S; i++) {
                const t = slotsTimes[i]
                const formattedTime = formatTime(t)
                // prefer canonical dateKey for slot lookup; but keep backward-compatibility with stored entry.date
                const slotDate = dateKey

                // seats allocated to this slot
                let seatsAllocated = base + (remainder > 0 ? 1 : 0)
                if (remainder > 0) remainder--

                // count booked for this slot by querying appointments (match canonical DD_MM_YYYY and legacy ISO forms)
                const canonicalKey = `${dateObj.getDate()}_${dateObj.getMonth() + 1}_${dateObj.getFullYear()}`
                const legacyISO = entry.date
                const isoFromCanonical = new Date(dateObj).toISOString()
                const slotDateCandidates = [canonicalKey]
                if (legacyISO && !slotDateCandidates.includes(legacyISO)) slotDateCandidates.push(legacyISO)
                if (!slotDateCandidates.includes(isoFromCanonical)) slotDateCandidates.push(isoFromCanonical)
                let bookedCount = await appointmentModel.countDocuments({ docId: doc._id.toString(), slotDate: { $in: slotDateCandidates }, slotTime: formattedTime, cancelled: { $ne: true } })
                const availableSeats = Math.max(0, seatsAllocated - bookedCount)
                // include slots even when fully booked so frontend can display counts and "Full" state
                slots.push({ datetime: new Date(t), time: formattedTime, totalSeats: seatsAllocated, bookedSeats: bookedCount, availableSeats })
            }

            // push canonical date key (DD_MM_YYYY) and include totalSeats
            result.push({ date: dateKey, dateObj, slots, totalSeats: Number(entry.totalSlots) || 0 })
        }

        // sort by date
        result.sort((a, b) => a.dateObj - b.dateObj)

        res.json({ success: true, availability: result })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Public API to return calendar embed id (if configured)
const getCalendar = async (req, res) => {
    try {
        // If no env var provided, fall back to the public calendar you gave
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'chavansandip1777@gmail.com'
        res.json({ success: true, calendarId })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {
    loginDoctor,
    appointmentsDoctor,
    appointmentCancel,
    doctorList,
    changeAvailablity,
    appointmentComplete,
    doctorDashboard,
    getAvailability,
    getCalendar,
    doctorProfile,
    updateDoctorProfile
}