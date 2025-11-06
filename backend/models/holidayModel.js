import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true }, // format: DD_MM_YYYY
    name: { type: String, required: true }, // holiday name/description
    isRecurring: { type: Boolean, default: false }, // for yearly recurring holidays
    createdAt: { type: Date, default: Date.now }
});

const holidayModel = mongoose.models.holiday || mongoose.model('holiday', holidaySchema);
export default holidayModel;