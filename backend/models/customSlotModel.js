import mongoose from 'mongoose'

const customSlotSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        index: true
    }, // Format: DD_MM_YYYY
    time: {
        type: String,
        required: true
    }, // Format: HH:MM AM/PM
    enabled: {
        type: Boolean,
        default: true
    },
    maxSeats: {
        type: Number,
        default: 1
    },
    isCustom: {
        type: Boolean,
        default: false
    }, // true if manually added by admin
    notes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Compound index for date and time
customSlotSchema.index({ date: 1, time: 1 }, { unique: true })

const customSlotModel = mongoose.models.customSlot || mongoose.model('customSlot', customSlotSchema)
export default customSlotModel
