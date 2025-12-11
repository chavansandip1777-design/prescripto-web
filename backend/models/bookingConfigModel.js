import mongoose from 'mongoose'

const bookingConfigSchema = new mongoose.Schema({
    // Basics
    eventTitle: { type: String, default: 'Book your appointment' },
    eventDescription: { type: String, default: '' },

    // Availability - Date Range
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    // Availability - Working Hours
    workingHours: {
        monday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '10:30' },
            end: { type: String, default: '18:30' }
        },
        tuesday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '10:30' },
            end: { type: String, default: '18:30' }
        },
        wednesday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '10:30' },
            end: { type: String, default: '18:30' }
        },
        thursday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '10:30' },
            end: { type: String, default: '18:30' }
        },
        friday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '10:30' },
            end: { type: String, default: '18:30' }
        },
        saturday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '10:30' },
            end: { type: String, default: '18:30' }
        },
        sunday: {
            enabled: { type: Boolean, default: false },
            start: { type: String, default: '10:30' },
            end: { type: String, default: '18:30' }
        }
    },

    // Limits
    minimumNotice: { type: Number, default: 12 },
    minimumNoticeUnit: { type: String, enum: ['minutes', 'hours', 'days'], default: 'hours' },
    timeSlotInterval: { type: Number, default: 30 },
    limitUpcomingBookings: { type: Number, default: 0 },
    limitFutureBookingValue: { type: Number, default: 30 },
    limitFutureBookingUnit: { type: String, enum: ['days', 'weeks', 'months'], default: 'days' },

    // Advanced
    redirectUrl: { type: String, default: '' },
    seatsPerSlot: { type: Number, default: 1 },
    offerSeats: { type: Boolean, default: false },

    // Metadata
    updatedAt: { type: Date, default: Date.now }
})

const bookingConfigModel = mongoose.models.bookingConfig || mongoose.model('bookingConfig', bookingConfigSchema)
export default bookingConfigModel
