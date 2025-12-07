import mongoose from "mongoose"

const appointmentSchema = new mongoose.Schema({
    userId: { type: String, required: false },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    patientName: { type: String, required: true },
    patientEmail: { type: String, required: false },
    patientMobile: { type: String, required: true },
    patientAddress: { type: String, required: false },
    notes: { type: String, required: false },
    userData: { type: Object, required: false }, // made optional for guest bookings
    amount: { type: Number, required: false, default: 0 }, // made optional
    date: { type: Number, required: true },
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    isGuestBooking: { type: Boolean, default: true }, // default to guest booking
    cancellationDeadline: { type: Date, required: false }, // 12 hours before appointment
    googleCalendarEventId: { type: String, required: false }, // Store Google Calendar event ID
    eventTitle: { type: String, required: false }, // Event title from config
    eventDescription: { type: String, required: false }, // Event description from config
    eventDuration: { type: Number, required: false } // Event duration from config
})

const appointmentModel = mongoose.models.appointment || mongoose.model("appointment", appointmentSchema)
export default appointmentModel