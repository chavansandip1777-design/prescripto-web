import appointmentModel from '../models/appointmentModel.js'
import availabilityModel from '../models/availabilityModel.js'
import holidayModel from '../models/holidayModel.js'

// Helper function to normalize slot date key
const normalizeSlotDateKey = (dateStr) => {
    if (!dateStr) return null;
    
    // if it's already in DD_MM_YYYY format, return as is
    if (typeof dateStr === 'string' && dateStr.includes('_') && !dateStr.includes('T') && !dateStr.includes('-')) {
        return dateStr;
    }
    
    // if it's an ISO string or other date format, convert it
    const date = new Date(dateStr);
    if (isNaN(date)) return null;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}_${month}_${year}`;
};

// Helper function to parse slot date
const parseSlotDate = (dateStr) => {
    const normalized = normalizeSlotDateKey(dateStr);
    if (!normalized) return null;
    
    const [day, month, year] = normalized.split('_').map(Number);
    return new Date(year, month - 1, day);
};

// Helper function to generate time slots
const generateTimeSlots = (startHour, endHour, durationMinutes) => {
    const slots = [];
    const start = startHour * 60; // convert to minutes
    const end = endHour * 60;
    
    for (let minutes = start; minutes < end; minutes += durationMinutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
    }
    
    return slots;
};

// Get availability for booking calendar
const getAvailability = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = {};
        if (startDate && endDate) {
            // Convert dates to DD_MM_YYYY format for filtering
            const start = normalizeSlotDateKey(startDate);
            const end = normalizeSlotDateKey(endDate);
            if (start && end) {
                dateFilter = { date: { $gte: start, $lte: end } };
            }
        }
        
        // Get holidays
        const holidays = await holidayModel.find(dateFilter);
        const holidayDates = new Set(holidays.map(h => h.date));
        
        // Get availability (or create default for weekdays)
        const availabilities = await availabilityModel.find(dateFilter);
        const availabilityMap = {};
        
        availabilities.forEach(avail => {
            availabilityMap[avail.date] = avail;
        });
        
        // If no specific date range, generate next 30 days
        if (!startDate || !endDate) {
            const today = new Date();
            const future = new Date();
            future.setDate(today.getDate() + 30);
            
            for (let d = new Date(today); d <= future; d.setDate(d.getDate() + 1)) {
                const dateKey = normalizeSlotDateKey(d.toISOString());
                const dayOfWeek = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
                
                // Only add weekdays (Monday-Friday)
                if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidayDates.has(dateKey)) {
                    if (!availabilityMap[dateKey]) {
                        // Create default availability
                        const defaultAvail = new availabilityModel({
                            date: dateKey,
                            totalSlots: 14,
                            slotDurationMinutes: 30,
                            startHour: 10,
                            endHour: 17,
                            maxBookingsPerSlot: 1
                        });
                        await defaultAvail.save();
                        availabilityMap[dateKey] = defaultAvail;
                    }
                }
            }
        }
        
        // Build response with slots and booking counts
        const result = [];
        
        for (const [dateKey, availability] of Object.entries(availabilityMap)) {
            if (holidayDates.has(dateKey)) continue;
            
            const timeSlots = generateTimeSlots(
                availability.startHour, 
                availability.endHour, 
                availability.slotDurationMinutes
            );
            
            // Count existing bookings for each slot
            const bookingCounts = await appointmentModel.aggregate([
                {
                    $match: {
                        slotDate: dateKey,
                        cancelled: false
                    }
                },
                {
                    $group: {
                        _id: '$slotTime',
                        count: { $sum: 1 }
                    }
                }
            ]);
            
            const bookingMap = {};
            bookingCounts.forEach(bc => {
                bookingMap[bc._id] = bc.count;
            });
            
            const slots = timeSlots.map(time => {
                const booked = bookingMap[time] || 0;
                const available = Math.max(0, availability.maxBookingsPerSlot - booked);
                
                return {
                    time,
                    totalSeats: availability.maxBookingsPerSlot,
                    bookedSeats: booked,
                    availableSeats: available,
                    datetime: new Date(parseSlotDate(dateKey).getTime() + 
                        (parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])) * 60000)
                };
            });
            
            result.push({
                date: dateKey,
                totalSeats: availability.maxBookingsPerSlot * timeSlots.length,
                slots
            });
        }
        
        res.json({ success: true, availability: result });
        
    } catch (error) {
        console.log('Error in getAvailability:', error);
        res.json({ success: false, message: error.message });
    }
};

// Book an appointment
const bookAppointment = async (req, res) => {
    try {
        const { slotDate, slotTime, patientName, patientEmail, patientMobile, patientAddress, notes } = req.body;
        
        if (!slotDate || !slotTime || !patientName || !patientMobile) {
            return res.json({ success: false, message: 'All required fields must be filled' });
        }
        
        const normalizedDate = normalizeSlotDateKey(slotDate);
        if (!normalizedDate) {
            return res.json({ success: false, message: 'Invalid date format' });
        }
        
        // Check if date is a holiday
        const holiday = await holidayModel.findOne({ date: normalizedDate });
        if (holiday) {
            return res.json({ success: false, message: 'Booking not available on holidays' });
        }
        
        // Check if date is a weekday
        const appointmentDate = parseSlotDate(normalizedDate);
        const dayOfWeek = appointmentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
            return res.json({ success: false, message: 'Booking only available Monday to Friday' });
        }
        
        // Check if appointment is at least 12 hours from now
        const now = new Date();
        const appointmentDateTime = new Date(appointmentDate);
        
        // Parse time correctly (handle AM/PM format)
        let [timeStr, period] = slotTime.split(' ');
        let [hour, minute] = timeStr.split(':').map(Number);
        
        // Convert to 24-hour format
        if (period && period.toUpperCase() === 'PM' && hour !== 12) {
            hour += 12;
        } else if (period && period.toUpperCase() === 'AM' && hour === 12) {
            hour = 0;
        }
        
        appointmentDateTime.setHours(hour, minute, 0, 0);
        
        const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
        if (hoursUntilAppointment < 12) {
            return res.json({ success: false, message: 'Appointments must be booked at least 12 hours in advance' });
        }
        
        // Check availability for this slot
        const availability = await availabilityModel.findOne({ date: normalizedDate });
        if (!availability) {
            return res.json({ success: false, message: 'No availability for selected date' });
        }
        
        // Count existing bookings for this slot
        const existingBookings = await appointmentModel.countDocuments({
            slotDate: normalizedDate,
            slotTime: slotTime,
            cancelled: false
        });
        
        if (existingBookings >= availability.maxBookingsPerSlot) {
            return res.json({ success: false, message: 'Slot Not Available' });
        }

        // Calculate cancellation deadline (12 hours before appointment)
        const cancellationDeadline = new Date(appointmentDateTime);
        cancellationDeadline.setHours(cancellationDeadline.getHours() - 12);

        // Create appointment
        const appointmentData = {
            slotDate: normalizedDate,
            slotTime,
            patientName,
            patientEmail: patientEmail || '',
            patientMobile,
            patientAddress: patientAddress || '',
            notes: notes || '',
            date: Date.now(),
            isGuestBooking: true,
            cancellationDeadline: cancellationDeadline
        };
        
        const newAppointment = new appointmentModel(appointmentData);
        await newAppointment.save();
        
        res.json({ 
            success: true, 
            message: 'Appointment Booked Successfully',
            appointmentId: newAppointment._id,
            cancellationDeadline: cancellationDeadline
        });
        
    } catch (error) {
        console.log('Error in bookAppointment:', error);
        res.json({ success: false, message: error.message });
    }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
    try {
        const { patientName, patientMobile, slotDate, slotTime } = req.body;
        
        if (!patientName || !patientMobile || !slotDate || !slotTime) {
            return res.json({ success: false, message: 'All fields are required for cancellation' });
        }
        
        const normalizedDate = normalizeSlotDateKey(slotDate);
        
        // Find appointment
        const appointment = await appointmentModel.findOne({
            patientName,
            patientMobile,
            slotDate: normalizedDate,
            slotTime,
            cancelled: false
        });
        
        if (!appointment) {
            return res.json({ success: false, message: 'Appointment not found' });
        }
        
        // Check if cancellation is within the allowed window
        const now = new Date();
        if (now > appointment.cancellationDeadline) {
            return res.json({ 
                success: false, 
                message: 'Cancellation window has expired. Appointments can only be cancelled up to 12 hours before the scheduled time.' 
            });
        }
        
        // Cancel appointment
        appointment.cancelled = true;
        await appointment.save();
        
        res.json({ success: true, message: 'Appointment cancelled successfully' });
        
    } catch (error) {
        console.log('Error in cancelAppointment:', error);
        res.json({ success: false, message: error.message });
    }
};

// Get user appointments (for cancellation lookup)
const getUserAppointments = async (req, res) => {
    try {
        const { patientName, patientMobile } = req.query;
        
        if (!patientName || !patientMobile) {
            return res.json({ success: false, message: 'Name and mobile number are required' });
        }
        
        const appointments = await appointmentModel.find({
            patientName,
            patientMobile,
            cancelled: false
        }).sort({ date: -1 });
        
        res.json({ success: true, appointments });
        
    } catch (error) {
        console.log('Error in getUserAppointments:', error);
        res.json({ success: false, message: error.message });
    }
};

export { getAvailability, bookAppointment, cancelAppointment, getUserAppointments };