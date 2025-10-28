import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import userModel from "../models/userModel.js";
import adminSettingsModel from "../models/adminSettingsModel.js";
import availabilityModel from '../models/availabilityModel.js'

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
        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

<<<<<<< HEAD
=======

>>>>>>> 2554fc4 (add floder)
}

// API for adding Doctor
const addDoctor = async (req, res) => {

    try {

        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body
        const imageFile = req.file

        // checking for all data to add doctor
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.json({ success: false, message: "Missing Details" })
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt)

        // upload image to cloudinary if configured, otherwise use a placeholder
        let imageUrl = 'https://via.placeholder.com/300x300?text=Doctor'
        try {
            const cloudKey = process.env.CLOUDINARY_API_KEY || ''
            const cloudSecret = process.env.CLOUDINARY_API_SECRET || ''
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME || ''
            const isMock = cloudKey.startsWith('mock') || cloudSecret.startsWith('mock')
            if (cloudKey && cloudSecret && cloudName && !isMock) {
                const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
                if (imageUpload && imageUpload.secure_url) imageUrl = imageUpload.secure_url
            } else {
                // Cloudinary not configured; use placeholder
                console.log('Cloudinary not configured, using placeholder image for doctor')
            }
        } catch (err) {
            console.log('Cloudinary upload failed, using placeholder image', err.message)
        }

        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),
            date: Date.now()
        }

        const newDoctor = new doctorModel(doctorData)
        await newDoctor.save()
        res.json({ success: true, message: 'Doctor Added' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select('-password')
        res.json({ success: true, doctors })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get single doctor by id (for admin)
const getDoctor = async (req, res) => {
    try {
        const { id } = req.params
        const doctor = await doctorModel.findById(id).select('-password')
        if (!doctor) return res.json({ success: false, message: 'Doctor not found' })
        res.json({ success: true, doctor })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get dashboard data for admin panel
const adminDashboard = async (req, res) => {
    try {

        const doctors = await doctorModel.find({})
        const users = await userModel.find({})
        const appointments = await appointmentModel.find({})

        const dashData = {
            doctors: doctors.length,
            appointments: appointments.length,
            patients: users.length,
            latestAppointments: appointments.reverse()
        }

        // Build richer day-wise and doctor-wise aggregates.
        // dayWise: { dateKey: { docId, totalSlots, booked, available, perSlot: { time: { totalSeats, booked, available } } } }
        // doctorWise: { docId: { totalSlots, booked, available, dates: { dateKey: {...} } } }
        const dayWise = {}
        const doctorWise = {}

        const availEntries = await availabilityModel.find({})
        // populate dayWise with availability totals per doc/date
        for (const entry of availEntries) {
            // entry.date may be canonical or ISO; compute canonical key
            let dateKey = entry.date
            if (typeof dateKey === 'string' && (dateKey.includes('T') || dateKey.includes('-'))) {
                const d = new Date(dateKey)
                if (!isNaN(d)) dateKey = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
            }
            if (!dayWise[dateKey]) dayWise[dateKey] = {}
            dayWise[dateKey][entry.docId] = dayWise[dateKey][entry.docId] || { totalSlots: 0, booked: 0, available: 0, perSlot: {} }
            dayWise[dateKey][entry.docId].totalSlots = Number(entry.totalSlots) || 0

            // initialize doctorWise per doc
            if (!doctorWise[entry.docId]) doctorWise[entry.docId] = { totalSlots: 0, booked: 0, available: 0, dates: {} }
            doctorWise[entry.docId].dates[dateKey] = { totalSlots: Number(entry.totalSlots) || 0, booked: 0, available: 0 }
            doctorWise[entry.docId].totalSlots += Number(entry.totalSlots) || 0
        }

        // For each appointment, attribute it to the right canonical date/doc and increment booked counters and per-slot counts
        for (const ap of appointments) {
            if (!ap.slotDate) continue
            const apDateRaw = ap.slotDate
            // possible candidates to match availability: ap.slotDate as-is, and canonical dd_mm_yyyy, and ISO of canonical
            const candidates = []
            if (typeof apDateRaw === 'string') candidates.push(apDateRaw)
            const maybe = new Date(apDateRaw)
            if (!isNaN(maybe)) {
                const canonical = `${maybe.getDate()}_${maybe.getMonth() + 1}_${maybe.getFullYear()}`
                if (!candidates.includes(canonical)) candidates.push(canonical)
                const iso = new Date(maybe).toISOString()
                if (!candidates.includes(iso)) candidates.push(iso)
            }

            // find a matching dayWise entry (dateKey) among candidates
            let matchedDateKey = null
            for (const c of candidates) {
                // c may be canonical or ISO; convert ISO to canonical for lookup
                let ck = c
                if (typeof ck === 'string' && (ck.includes('T') || ck.includes('-'))) {
                    const d = new Date(ck)
                    if (!isNaN(d)) ck = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
                }
                if (dayWise[ck] && dayWise[ck][ap.docId]) {
                    matchedDateKey = ck
                    break
                }
            }

            // fallback: if no availability entry found for ap date, still record under its canonical date
            if (!matchedDateKey) {
                const d = new Date(apDateRaw)
                if (!isNaN(d)) matchedDateKey = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
            }

            if (!matchedDateKey) continue

            // increment dayWise and doctorWise counters
            if (!dayWise[matchedDateKey]) dayWise[matchedDateKey] = {}
            if (!dayWise[matchedDateKey][ap.docId]) dayWise[matchedDateKey][ap.docId] = { totalSlots: 0, booked: 0, available: 0, perSlot: {} }
            dayWise[matchedDateKey][ap.docId].booked = (dayWise[matchedDateKey][ap.docId].booked || 0) + 1

            if (!doctorWise[ap.docId]) doctorWise[ap.docId] = { totalSlots: 0, booked: 0, available: 0, dates: {} }
            doctorWise[ap.docId].booked = (doctorWise[ap.docId].booked || 0) + 1
            if (!doctorWise[ap.docId].dates[matchedDateKey]) doctorWise[ap.docId].dates[matchedDateKey] = { totalSlots: 0, booked: 0, available: 0 }
            doctorWise[ap.docId].dates[matchedDateKey].booked = (doctorWise[ap.docId].dates[matchedDateKey].booked || 0) + 1

            // per-slot breakdown: count by slotTime
            const slotT = ap.slotTime || 'unknown'
            const perSlot = dayWise[matchedDateKey][ap.docId].perSlot
            if (!perSlot[slotT]) perSlot[slotT] = { totalSeats: 0, booked: 0, available: 0 }
            perSlot[slotT].booked = (perSlot[slotT].booked || 0) + 1
            // also update doctorWise per-slot
            const docDatePer = doctorWise[ap.docId].dates[matchedDateKey].perSlot || {}
            if (!docDatePer[slotT]) docDatePer[slotT] = { totalSeats: 0, booked: 0, available: 0 }
            docDatePer[slotT].booked = (docDatePer[slotT].booked || 0) + 1
            doctorWise[ap.docId].dates[matchedDateKey].perSlot = docDatePer
        }

        // compute available = total - booked where possible, and propagate per-slot totals if we can infer from availability
        // For each availability entry, set per-slot total if not already set
        for (const entry of availEntries) {
            let dateKey = entry.date
            if (typeof dateKey === 'string' && (dateKey.includes('T') || dateKey.includes('-'))) {
                const d = new Date(dateKey)
                if (!isNaN(d)) dateKey = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
            }
            const docId = entry.docId
            const slotDuration = entry.slotDurationMinutes
            let cursor = new Date(new Date(dateKey.split('_').reverse().join('-')))
            // above is a rough parse; instead rebuild date from dateKey
            const parts = dateKey.split('_').map(Number)
            const dObj = new Date(parts[2], parts[1] - 1, parts[0])
            cursor = new Date(dObj); cursor.setHours(entry.startHour, 0, 0, 0)
            const endTime = new Date(dObj); endTime.setHours(entry.endHour, 0, 0, 0)
            const slotsTimes = []
            while (cursor < endTime) {
                slotsTimes.push(new Date(cursor))
                cursor = new Date(cursor.getTime() + slotDuration * 60 * 1000)
            }
            const S = slotsTimes.length
            const totalSeats = Number(entry.totalSlots) || 0
            const base = S > 0 ? Math.floor(totalSeats / S) : 0
            let remainder = S > 0 ? totalSeats % S : 0

            for (let i = 0; i < S; i++) {
                const t = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(slotsTimes[i]).toLowerCase()
                const seatsAllocated = base + (remainder > 0 ? 1 : 0)
                if (remainder > 0) remainder--
                if (!dayWise[dateKey]) dayWise[dateKey] = {}
                if (!dayWise[dateKey][docId]) dayWise[dateKey][docId] = { totalSlots: 0, booked: 0, available: 0, perSlot: {} }
                if (!dayWise[dateKey][docId].perSlot[t]) dayWise[dateKey][docId].perSlot[t] = { totalSeats: seatsAllocated, booked: 0, available: seatsAllocated }
                else {
                    dayWise[dateKey][docId].perSlot[t].totalSeats = seatsAllocated
                    dayWise[dateKey][docId].perSlot[t].available = Math.max(0, seatsAllocated - (dayWise[dateKey][docId].perSlot[t].booked || 0))
                }
                // ensure doctorWise has per-slot totals
                if (!doctorWise[docId]) doctorWise[docId] = { totalSlots: 0, booked: 0, available: 0, dates: {} }
                if (!doctorWise[docId].dates[dateKey]) doctorWise[docId].dates[dateKey] = { totalSeats: 0, booked: 0, available: 0, perSlot: {} }
                if (!doctorWise[docId].dates[dateKey].perSlot) doctorWise[docId].dates[dateKey].perSlot = {}
                if (!doctorWise[docId].dates[dateKey].perSlot[t]) doctorWise[docId].dates[dateKey].perSlot[t] = { totalSeats: seatsAllocated, booked: 0, available: seatsAllocated }
            }
        }

        // finalize totals: compute available where possible
        Object.keys(dayWise).forEach(dateKey => {
            Object.keys(dayWise[dateKey]).forEach(docId => {
                const item = dayWise[dateKey][docId]
                item.available = Math.max(0, (item.totalSlots || 0) - (item.booked || 0))
                // finalize per-slot available
                Object.keys(item.perSlot || {}).forEach(t => {
                    const ps = item.perSlot[t]
                    ps.available = Math.max(0, (ps.totalSeats || 0) - (ps.booked || 0))
                })
            })
        })

        Object.keys(doctorWise).forEach(docId => {
            const doc = doctorWise[docId]
            doc.available = Math.max(0, (doc.totalSlots || 0) - (doc.booked || 0))
            Object.keys(doc.dates || {}).forEach(dateKey => {
                const d = doc.dates[dateKey]
                d.available = Math.max(0, (d.totalSlots || 0) - (d.booked || 0))
                // ensure perSlot available
                if (d.perSlot) Object.keys(d.perSlot).forEach(t => { const ps = d.perSlot[t]; ps.available = Math.max(0, (ps.totalSeats || 0) - (ps.booked || 0)) })
            })
        })

        dashData.dayWise = dayWise
        dashData.doctorWise = doctorWise

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get admin settings
const getSettings = async (req, res) => {
    try {
        let settings = await adminSettingsModel.findOne({})
        if (!settings) {
            settings = new adminSettingsModel({ date: Date.now() })
            await settings.save()
        }
        res.json({ success: true, settings })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update admin settings
const updateSettings = async (req, res) => {
    try {
        const { activeDays, seatsPerSlot, slotDurationMinutes } = req.body
        let settings = await adminSettingsModel.findOne({})
        if (!settings) {
            settings = new adminSettingsModel({ activeDays, seatsPerSlot, slotDurationMinutes, date: Date.now() })
            await settings.save()
        } else {
            await adminSettingsModel.findByIdAndUpdate(settings._id, { activeDays, seatsPerSlot, slotDurationMinutes })
        }
        res.json({ success: true, message: 'Settings Updated' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to create availability for a doctor for a date range
const createAvailability = async (req, res) => {
    try {
        const { docId, startDate, endDate, totalSlots, slotDurationMinutes, startHour = 9, endHour = 17 } = req.body

        if (!docId || !startDate || !endDate || !totalSlots || !slotDurationMinutes) {
            return res.json({ success: false, message: 'Missing details' })
        }

        // parse dates (expected YYYY-MM-DD or similar parsable by Date)
        const s = new Date(startDate)
        const e = new Date(endDate)
        if (isNaN(s) || isNaN(e) || s > e) return res.json({ success: false, message: 'Invalid date range' })

        const created = []
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            const day = d.getDate()
            const month = d.getMonth() + 1
            const year = d.getFullYear()
            const dateKey = `${day}_${month}_${year}`

            // upsert availability for that date
            const existing = await availabilityModel.findOne({ docId, date: dateKey })
            if (existing) continue

            const newAvail = new availabilityModel({ docId, date: dateKey, totalSlots, slotDurationMinutes, startHour, endHour })
            await newAvail.save()
            created.push(newAvail)

            // Google Calendar integration disabled — skipping event creation for availability
            console.log('Google Calendar disabled: skipping event creation for availability', dateKey)
        }

        res.json({ success: true, message: 'Availability created', created })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {
    loginAdmin,
    appointmentsAdmin,
    appointmentCancel,
    addDoctor,
    allDoctors,
    getDoctor,
    adminDashboard,
    createAvailability,
    getSettings, updateSettings,
    updateDoctor
}

<<<<<<< HEAD
=======

>>>>>>> 2554fc4 (add floder)
// Admin: update doctor endpoint (allows image upload)
const updateDoctor = async (req, res) => {
    try {
        const { id } = req.body
        const imageFile = req.file
        const update = {}
        const fields = ['name', 'speciality', 'degree', 'experience', 'about', 'fees', 'address', 'available']
        for (const f of fields) if (req.body[f]) update[f] = f === 'address' ? JSON.parse(req.body[f]) : req.body[f]

        if (imageFile) {
            try {
                const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' })
                if (imageUpload && imageUpload.secure_url) update.image = imageUpload.secure_url
            } catch (e) {
                console.log('Cloudinary upload failed in updateDoctor', e.message)
            }
        }

        await doctorModel.findByIdAndUpdate(id, update)
        res.json({ success: true, message: 'Doctor updated' })
    } catch (e) {
        console.log(e)
        res.json({ success: false, message: e.message })
    }
}

