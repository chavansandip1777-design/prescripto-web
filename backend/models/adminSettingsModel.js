import mongoose from 'mongoose'

const adminSettingsSchema = new mongoose.Schema({
    activeDays: { type: Number, default: 3 },
    seatsPerSlot: { type: Number, default: 1 },
    slotDurationMinutes: { type: Number, default: 30 },
    date: { type: Number, required: true }
})

const adminSettingsModel = mongoose.models.adminSettings || mongoose.model('adminSettings', adminSettingsSchema)
export default adminSettingsModel
