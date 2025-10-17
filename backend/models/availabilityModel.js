import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema({
    docId: { type: mongoose.Schema.Types.ObjectId, ref: 'doctor', required: true },
    date: { type: String, required: true }, // format: DD_MM_YYYY
    totalSlots: { type: Number, required: true }, // total seats for the day
    slotDurationMinutes: { type: Number, required: true },
    startHour: { type: Number, default: 9 },
    endHour: { type: Number, default: 17 },
    calendarEventId: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { minimize: false })

const availabilityModel = mongoose.models.availability || mongoose.model('availability', availabilitySchema)
export default availabilityModel
