import appointmentModel from '../models/appointmentModel.js'
import availabilityModel from '../models/availabilityModel.js'
import holidayModel from '../models/holidayModel.js'
import slotModel from '../models/slotModel.js'

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

        // Get current date and time
        const now = new Date();
        const todayKey = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Get holidays
        const holidays = await holidayModel.find(dateFilter);
        const holidayDates = new Set(holidays.map(h => h.date));

        // Get slots from slot model
        const slots = await slotModel.find({ ...dateFilter, isEnabled: true }).lean();

        // Get all booking counts in ONE query using aggregation
        const bookingCounts = await appointmentModel.aggregate([
            {
                $match: {
                    cancelled: false,
                    ...(dateFilter.date ? { slotDate: dateFilter.date } : {})
                }
            },
            {
                $group: {
                    _id: { slotDate: '$slotDate', slotTime: '$slotTime' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Create a map for quick lookup: "date_time" => count
        const bookingCountMap = {};
        bookingCounts.forEach(item => {
            const key = `${item._id.slotDate}_${item._id.slotTime}`;
            bookingCountMap[key] = item.count;
        });

        // Group slots by date
        const slotsByDate = {};

        for (const slot of slots) {
            // Skip holidays
            if (holidayDates.has(slot.date)) continue;

            // Parse slot date and time to check if it's in the past
            const [day, month, year] = slot.date.split('_').map(Number);
            const slotDate = new Date(year, month - 1, day);

            // Skip past dates
            const slotDateKey = slot.date;
            const isToday = slotDateKey === todayKey;
            const isPastDate = slotDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (isPastDate) continue;

            // For today, check if the time slot has passed
            if (isToday) {
                // Parse time (format: "HH:MM AM/PM")
                const timeMatch = slot.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                if (timeMatch) {
                    let slotHour = parseInt(timeMatch[1]);
                    const slotMinute = parseInt(timeMatch[2]);
                    const period = timeMatch[3].toUpperCase();

                    // Convert to 24-hour format
                    if (period === 'PM' && slotHour !== 12) {
                        slotHour += 12;
                    } else if (period === 'AM' && slotHour === 12) {
                        slotHour = 0;
                    }

                    // Skip if time has passed (with 12 hour buffer for advance booking)
                    const slotDateTime = new Date(year, month - 1, day, slotHour, slotMinute);
                    const hoursUntil = (slotDateTime - now) / (1000 * 60 * 60);

                    if (hoursUntil < 12) continue; // 12-hour advance booking requirement
                }
            }

            // Get booking count from map (O(1) lookup instead of database query)
            const bookingKey = `${slot.date}_${slot.time}`;
            const bookingCount = bookingCountMap[bookingKey] || 0;

            const availableSeats = Math.max(0, slot.maxSeats - bookingCount);

            // Add slot to the date group
            if (!slotsByDate[slot.date]) {
                slotsByDate[slot.date] = [];
            }

            // Calculate datetime for this slot
            const timeMatch = slot.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            let slotHour = 10; // default
            let slotMinute = 0;

            if (timeMatch) {
                slotHour = parseInt(timeMatch[1]);
                slotMinute = parseInt(timeMatch[2]);
                const period = timeMatch[3].toUpperCase();

                if (period === 'PM' && slotHour !== 12) {
                    slotHour += 12;
                } else if (period === 'AM' && slotHour === 12) {
                    slotHour = 0;
                }
            }

            slotsByDate[slot.date].push({
                time: slot.time,
                totalSeats: slot.maxSeats,
                bookedSeats: bookingCount,
                availableSeats: availableSeats,
                datetime: new Date(year, month - 1, day, slotHour, slotMinute)
            });
        }

        // Build response
        const result = Object.entries(slotsByDate).map(([date, slots]) => ({
            date,
            totalSeats: slots.reduce((sum, s) => sum + s.totalSeats, 0),
            slots: slots.sort((a, b) => a.datetime - b.datetime)
        }));

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

        // Check if slot exists and is enabled
        const slot = await slotModel.findOne({ date: normalizedDate, time: slotTime });
        if (!slot) {
            return res.json({ success: false, message: 'Slot not found' });
        }

        if (!slot.isEnabled) {
            return res.json({ success: false, message: 'This slot is currently disabled' });
        }

        // Check if date is a holiday
        const holiday = await holidayModel.findOne({ date: normalizedDate });
        if (holiday) {
            return res.json({ success: false, message: 'Booking not available on holidays' });
        }

        // Parse the appointment date for time validation
        const appointmentDate = parseSlotDate(normalizedDate);

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

        // Count existing bookings for this slot
        const existingBookings = await appointmentModel.countDocuments({
            slotDate: normalizedDate,
            slotTime: slotTime,
            cancelled: false
        });

        if (existingBookings >= slot.maxSeats) {
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