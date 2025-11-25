import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
    date: { type: String, required: true }, // format: DD_MM_YYYY
    time: { type: String, required: true }, // format: HH:MM AM/PM
    maxSeats: { type: Number, required: true, default: 1 },
    isEnabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { minimize: false })

// Compound index to ensure unique date-time combinations
slotSchema.index({ date: 1, time: 1 }, { unique: true })

const slotModel = mongoose.models.slot || mongoose.model('slot', slotSchema)
export default slotModel
