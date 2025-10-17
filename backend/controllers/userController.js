import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import adminSettingsModel from "../models/adminSettingsModel.js";
import availabilityModel from '../models/availabilityModel.js'
import { v2 as cloudinary } from 'cloudinary'
import stripe from "stripe";
import razorpay from 'razorpay';

// Gateway Initialize
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// API to register user
const registerUser = async (req, res) => {

    try {
        const { name, email, password } = req.body;

        // checking for all data to register user
        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' })
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

        const userData = {
            name,
            email,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

        res.json({ success: true, token })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Helper: normalize incoming slotDate (ISO, DD_MM_YYYY, Date) into canonical DD_MM_YYYY
const normalizeSlotDateKey = (slotDate) => {
    if (!slotDate) return slotDate
    if (typeof slotDate === 'string' && /^\d{1,2}_\d{1,2}_\d{4}$/.test(slotDate)) return slotDate
    // try parse as date
    const maybe = new Date(slotDate)
    if (!isNaN(maybe)) {
        return `${maybe.getDate()}_${maybe.getMonth() + 1}_${maybe.getFullYear()}`
    }
    // fallback: if it contains T or dots, strip milliseconds and timezone then replace invalid chars
    if (typeof slotDate === 'string') {
        // remove milliseconds and timezone like .000Z
        const withoutMs = slotDate.split('.').shift()
        // replace non-alphanumeric with underscore
        return withoutMs.replace(/[^0-9]/g, '_')
    }
    return slotDate
}

// API to login user
const loginUser = async (req, res) => {

    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "User does not exist" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        }
        else {
            res.json({ success: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user profile data
const getProfile = async (req, res) => {

    try {
        const { userId } = req.body
        const userData = await userModel.findById(userId).select('-password')

        res.json({ success: true, userData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update user profile
const updateProfile = async (req, res) => {

    try {

        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

        if (imageFile) {

            // upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
            const imageURL = imageUpload.secure_url

            await userModel.findByIdAndUpdate(userId, { image: imageURL })
        }

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to book appointment 
const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime, patientName, patientMobile } = req.body

        if (!patientName || !patientMobile) {
            return res.json({ success: false, message: 'Patient name and mobile number are required' })
        }

        const docData = await doctorModel.findById(docId).select("-password")
        if (!docData) return res.json({ success: false, message: 'Doctor not found' })
        if (!docData.available) return res.json({ success: false, message: 'Doctor Not Available' })

        // compute canonical DD_MM_YYYY key from incoming slotDate to avoid '.' in Mongo paths
        // Normalize incoming slotDate into canonical key
        let slotDateKey = normalizeSlotDateKey(slotDate)

        // now find availability by canonical key
        let availability = await availabilityModel.findOne({ docId, date: slotDateKey })
        if (availability) {
            // normalize stored availability.date to canonical key to avoid ISO strings
            slotDateKey = normalizeSlotDateKey(availability.date)
        }

        // fallback: if no availability entry found, use global seatsPerSlot setting
        const settings = await adminSettingsModel.findOne({})
        const globalSeatsPerSlot = settings ? settings.seatsPerSlot : 1

        let seatsAllocatedForSlot = globalSeatsPerSlot
        if (availability) {
            // compute allocated seats for each slot following same algorithm used in getAvailability
            const dateObjParts = availability.date.split('_').map(Number)
            const dateObj = new Date(dateObjParts[2], dateObjParts[1] - 1, dateObjParts[0])
            const slotDuration = availability.slotDurationMinutes
            let cursor = new Date(dateObj)
            cursor.setHours(availability.startHour, 0, 0, 0)
            const endTime = new Date(dateObj)
            endTime.setHours(availability.endHour, 0, 0, 0)
            const slotsTimes = []
            while (cursor < endTime) {
                slotsTimes.push(new Date(cursor))
                cursor = new Date(cursor.getTime() + slotDuration * 60 * 1000)
            }
            const S = slotsTimes.length
            const totalSeats = Number(availability.totalSlots) || 0
            const base = S > 0 ? Math.floor(totalSeats / S) : 0
            const remainder = S > 0 ? totalSeats % S : 0

            // build formatted times and find index
            const formatTime = (dt) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(dt).toLowerCase()
            const formattedTimes = slotsTimes.map(t => formatTime(t))
            const normalizedSlotTime = slotTime && typeof slotTime === 'string' ? slotTime.toLowerCase() : slotTime
            const idx = formattedTimes.findIndex(t => t === normalizedSlotTime)
            if (idx === -1) return res.json({ success: false, message: 'Slot Not Available' })
            seatsAllocatedForSlot = base + (idx < remainder ? 1 : 0)
        }

        // ensure slots_booked structure and migrate legacy array format if needed
        let slots_booked = docData.slots_booked || {}
        if (Array.isArray(slots_booked[slotDateKey])) {
            const arr = slots_booked[slotDateKey]
            const map = {}
            arr.forEach(t => { map[t] = (map[t] || 0) + 1 })
            await doctorModel.findByIdAndUpdate(docId, { [`slots_booked.${slotDateKey}`]: map })
            slots_booked[slotDateKey] = map
        }

        // atomic increment using seatsAllocatedForSlot
        // normalize slotTime to the same format used in getAvailability (lowercase am/pm)
        const normalizedSlotTime = slotTime && typeof slotTime === 'string' ? slotTime.toLowerCase() : slotTime
        const path = `slots_booked.${slotDateKey}.${normalizedSlotTime}`
        const filter = {
            _id: docId,
            $or: [
                { [path]: { $lt: seatsAllocatedForSlot } },
                { [path]: { $exists: false } }
            ]
        }

        console.log('BOOKING DEBUG path=', path, 'seatsAllocatedForSlot=', seatsAllocatedForSlot, 'slotDateKey=', slotDateKey, 'normalizedSlotTime=', normalizedSlotTime)
        console.log('BOOKING DEBUG filter=', JSON.stringify(filter))
        const updatedDoc = await doctorModel.findOneAndUpdate(filter, { $inc: { [path]: 1 } }, { new: true })
        if (!updatedDoc) {
            return res.json({ success: false, message: 'Slot Not Available' })
        }

        // proceed to create appointment
        const userData = await userModel.findById(userId).select("-password")
        delete docData.slots_booked

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime: normalizedSlotTime,
            slotDate: slotDateKey,
            patientName,
            patientMobile,
            date: Date.now()
        }

        let newAppointment
        try {
            newAppointment = new appointmentModel(appointmentData)
            await newAppointment.save()
        } catch (err) {
            // rollback increment
            await doctorModel.findByIdAndUpdate(docId, { $inc: { [path]: -1 } })
            return res.json({ success: false, message: 'Failed to save appointment' })
        }

        // Google Calendar integration disabled. Skipping event creation.
        console.log('Google Calendar disabled: skipping calendar event creation for appointment')

        res.json({ success: true, message: 'Appointment Booked', appointmentId: newAppointment._id })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {

        const { userId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        // verify appointment user 
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })


        // releasing doctor slot 
        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked || {}

        // migrate array to map if necessary
        if (Array.isArray(slots_booked[slotDate])) {
            const arr = slots_booked[slotDate]
            const map = {}
            arr.forEach(t => { map[t] = (map[t] || 0) + 1 })
            slots_booked[slotDate] = map
        }

        if (slots_booked[slotDate] && slots_booked[slotDate][slotTime]) {
            slots_booked[slotDate][slotTime] = slots_booked[slotDate][slotTime] - 1
            if (slots_booked[slotDate][slotTime] <= 0) {
                delete slots_booked[slotDate][slotTime]
            }
            // if no times left for date, remove date key
            if (Object.keys(slots_booked[slotDate] || {}).length === 0) {
                delete slots_booked[slotDate]
            }
        }

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
    try {

        const { userId } = req.body
        const appointments = await appointmentModel.find({ userId })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to make payment of appointment using razorpay
const paymentRazorpay = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }



        // creating options for razorpay payment
        const options = {
            amount: appointmentData.amount * 100,
            currency: process.env.CURRENCY,
            receipt: appointmentId,
        }

        // creation of an order
        const order = await razorpayInstance.orders.create(options)

        res.json({ success: true, order })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to verify payment of razorpay
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id } = req.body
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if (orderInfo.status === 'paid') {
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true })
            res.json({ success: true, message: "Payment Successful" })
        }
        else {
            res.json({ success: false, message: 'Payment Failed' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to make payment of appointment using Stripe
const paymentStripe = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const { origin } = req.headers

        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }

        const currency = process.env.CURRENCY.toLocaleLowerCase()

        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: "Appointment Fees"
                },
                unit_amount: appointmentData.amount * 100
            },
            quantity: 1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
            cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
            line_items: line_items,
            mode: 'payment',
        })

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const verifyStripe = async (req, res) => {
    try {

        const { appointmentId, success } = req.body

        if (success === "true") {
            await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true })
            return res.json({ success: true, message: 'Payment Successful' })
        }

        res.json({ success: false, message: 'Payment Failed' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to book appointment for guest users (without login)
const bookAppointmentGuest = async (req, res) => {
    try {
        const { docId, slotDate, slotTime, patientName, patientMobile } = req.body

        if (!patientName || !patientMobile) return res.json({ success: false, message: 'Patient name and mobile number are required' })

        const docData = await doctorModel.findById(docId).select("-password")
        if (!docData) return res.json({ success: false, message: 'Doctor not found' })
        if (!docData.available) return res.json({ success: false, message: 'Doctor Not Available' })

        // compute canonical DD_MM_YYYY key from incoming slotDate to avoid '.' in Mongo paths
        // Normalize incoming slotDate into canonical key
        let slotDateKey = normalizeSlotDateKey(slotDate)

        // find availability for canonical key
        let availability = await availabilityModel.findOne({ docId, date: slotDateKey })
        if (availability) {
            // normalize stored availability.date to canonical key to avoid ISO strings
            slotDateKey = normalizeSlotDateKey(availability.date)
        }

        const settings = await adminSettingsModel.findOne({})
        const globalSeatsPerSlot = settings ? settings.seatsPerSlot : 1

        let seatsAllocatedForSlot = globalSeatsPerSlot
        if (availability) {
            const dateObjParts = availability.date.split('_').map(Number)
            const dateObj = new Date(dateObjParts[2], dateObjParts[1] - 1, dateObjParts[0])
            const slotDuration = availability.slotDurationMinutes
            let cursor = new Date(dateObj)
            cursor.setHours(availability.startHour, 0, 0, 0)
            const endTime = new Date(dateObj)
            endTime.setHours(availability.endHour, 0, 0, 0)
            const slotsTimes = []
            while (cursor < endTime) {
                slotsTimes.push(new Date(cursor))
                cursor = new Date(cursor.getTime() + slotDuration * 60 * 1000)
            }
            const S = slotsTimes.length
            const totalSeats = Number(availability.totalSlots) || 0
            const base = S > 0 ? Math.floor(totalSeats / S) : 0
            const remainder = S > 0 ? totalSeats % S : 0
            const formatTime = (dt) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(dt).toLowerCase()
            const formattedTimes = slotsTimes.map(t => formatTime(t))
            const normalizedSlotTime = slotTime && typeof slotTime === 'string' ? slotTime.toLowerCase() : slotTime
            const idx = formattedTimes.findIndex(t => t === normalizedSlotTime)
            if (idx === -1) return res.json({ success: false, message: 'Slot Not Available' })
            seatsAllocatedForSlot = base + (idx < remainder ? 1 : 0)
        }

        let slots_booked = docData.slots_booked || {}
        if (Array.isArray(slots_booked[slotDateKey])) {
            const arr = slots_booked[slotDateKey]
            const map = {}
            arr.forEach(t => { map[t] = (map[t] || 0) + 1 })
            await doctorModel.findByIdAndUpdate(docId, { [`slots_booked.${slotDateKey}`]: map })
            slots_booked[slotDateKey] = map
        }

        const normalizedSlotTime = slotTime && typeof slotTime === 'string' ? slotTime.toLowerCase() : slotTime
        const path = `slots_booked.${slotDateKey}.${normalizedSlotTime}`
        const filter = {
            _id: docId,
            $or: [
                { [path]: { $lt: seatsAllocatedForSlot } },
                { [path]: { $exists: false } }
            ]
        }

        console.log('BOOKING DEBUG path=', path, 'seatsAllocatedForSlot=', seatsAllocatedForSlot, 'slotDateKey=', slotDateKey, 'normalizedSlotTime=', normalizedSlotTime)
        console.log('BOOKING DEBUG filter=', JSON.stringify(filter))
        const updatedDoc = await doctorModel.findOneAndUpdate(filter, { $inc: { [path]: 1 } }, { new: true })
        if (!updatedDoc) return res.json({ success: false, message: 'Slot Not Available' })

        const guestUserData = { name: patientName, phone: patientMobile, isGuest: true }

        const appointmentData = {
            docId,
            docData,
            userData: guestUserData,
            amount: docData.fees,
            slotTime: normalizedSlotTime,
            slotDate: slotDateKey,
            patientName,
            patientMobile,
            isGuestBooking: true,
            date: Date.now()
        }

        let newAppointment
        try {
            newAppointment = new appointmentModel(appointmentData)
            await newAppointment.save()
        } catch (err) {
            // rollback
            await doctorModel.findByIdAndUpdate(docId, { $inc: { [path]: -1 } })
            return res.json({ success: false, message: 'Failed to save appointment' })
        }

        // Google Calendar integration disabled. Skipping event creation for guest booking.
        console.log('Google Calendar disabled: skipping calendar event creation for guest appointment')

        res.json({ success: true, message: 'Appointment Booked Successfully', appointmentId: newAppointment._id })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {
    loginUser,
    registerUser,
    getProfile,
    updateProfile,
    bookAppointment,
    bookAppointmentGuest,
    listAppointment,
    cancelAppointment,
    paymentRazorpay,
    verifyRazorpay,
    paymentStripe,
    verifyStripe
}