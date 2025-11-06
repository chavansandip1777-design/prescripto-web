import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true }, // format: DD_MM_YYYY
    totalSlots: { type: Number, required: true, default: 14 }, // 14 slots (30min each, 7 hours)
    slotDurationMinutes: { type: Number, required: true, default: 30 },
    startHour: { type: Number, default: 10 }, // 10:00 AM
    endHour: { type: Number, default: 17 }, // 5:00 PM
    maxBookingsPerSlot: { type: Number, default: 1 },
    isHoliday: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { minimize: false })

const availabilityModel = mongoose.models.availability || mongoose.model('availability', availabilitySchema)
export default availabilityModel
