import appointmentModel from '../models/appointmentModel.js'
import holidayModel from '../models/holidayModel.js'
import bookingConfigModel from '../models/bookingConfigModel.js'
import customSlotModel from '../models/customSlotModel.js'
import { createCalendarEvent, cancelCalendarEvent } from '../utils/googleCalendar.js'

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

// Helper function to calculate notice in milliseconds
const calculateNoticeInMs = (value, unit) => {
    const multipliers = {
        'minutes': 60 * 1000,
        'hours': 60 * 60 * 1000,
        'days': 24 * 60 * 60 * 1000
    };
    return value * (multipliers[unit] || multipliers.hours);
};

// Helper function to calculate future booking limit in milliseconds
const calculateFutureBookingLimit = (value, unit) => {
    const multipliers = {
        'days': 24 * 60 * 60 * 1000,
        'weeks': 7 * 24 * 60 * 60 * 1000,
        'months': 30 * 24 * 60 * 60 * 1000
    };
    return value * (multipliers[unit] || multipliers.days);
};

// Helper function to format notice text
const formatNoticeText = (value, unit) => {
    return `${value} ${unit}`;
};

// Get availability for booking calendar based on configuration
const getAvailability = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Get booking configuration
        let bookingConfig = await bookingConfigModel.findOne();
        if (!bookingConfig) {
            bookingConfig = new bookingConfigModel();
            await bookingConfig.save();
        }

        const now = new Date();
        const todayKey = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;

        // Calculate date range based on config
        const minimumNoticeMs = calculateNoticeInMs(bookingConfig.minimumNotice, bookingConfig.minimumNoticeUnit);
        const futureBookingLimitMs = calculateFutureBookingLimit(
            bookingConfig.limitFutureBookingValue,
            bookingConfig.limitFutureBookingUnit
        );

        // Determine start and end dates - prioritize configured date range, then use query params, finally defaults
        let startDateObj, endDateObj;

        if (bookingConfig.startDate && bookingConfig.endDate) {
            // Use configured date range
            startDateObj = new Date(bookingConfig.startDate);
            endDateObj = new Date(bookingConfig.endDate);

            // Ensure start date respects minimum notice
            const minStartDate = new Date(now.getTime() + minimumNoticeMs);
            if (startDateObj < minStartDate) {
                startDateObj = minStartDate;
            }
        } else {
            // Fallback to query params or defaults
            startDateObj = startDate ? new Date(startDate) : new Date(now.getTime() + minimumNoticeMs);
            endDateObj = endDate ? new Date(endDate) : new Date(now.getTime() + futureBookingLimitMs);
        }

        // Get holidays
        const holidays = await holidayModel.find({});
        const holidayDates = new Set(holidays.map(h => h.date));

        // Get all booking counts
        const bookingCounts = await appointmentModel.aggregate([
            {
                $match: { cancelled: false }
            },
            {
                $group: {
                    _id: { slotDate: '$slotDate', slotTime: '$slotTime' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const bookingCountMap = {};
        bookingCounts.forEach(item => {
            const key = `${item._id.slotDate}_${item._id.slotTime}`;
            bookingCountMap[key] = item.count;
        });

        // Generate slots based on working hours configuration
        const slotsByDate = {};
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        // Iterate through dates in range
        for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
            const dateKey = `${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}_${d.getFullYear()}`;

            // Skip if holiday
            if (holidayDates.has(dateKey)) continue;

            // Get day of week
            const dayName = dayNames[d.getDay()];
            const dayConfig = bookingConfig.workingHours[dayName];

            // Skip if day is not enabled
            if (!dayConfig || !dayConfig.enabled) continue;

            // Parse working hours
            const [startHour, startMin] = dayConfig.start.split(':').map(Number);
            const [endHour, endMin] = dayConfig.end.split(':').map(Number);

            // Generate time slots for this day
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            const interval = bookingConfig.timeSlotInterval;

            const daySlots = [];

            for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
                const slotHour = Math.floor(minutes / 60);
                const slotMin = minutes % 60;

                // Create slot datetime
                const slotDateTime = new Date(d);
                slotDateTime.setHours(slotHour, slotMin, 0, 0);

                // Check if slot is in the past or within minimum notice
                const timeUntilSlot = slotDateTime - now;
                if (timeUntilSlot < minimumNoticeMs) continue;

                // Format time in 12-hour format with AM/PM
                let displayHour = slotHour;
                const period = slotHour >= 12 ? 'PM' : 'AM';
                if (displayHour === 0) displayHour = 12;
                else if (displayHour > 12) displayHour -= 12;

                const timeStr = `${String(displayHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')} ${period}`;

                // Check booking count
                const bookingKey = `${dateKey}_${timeStr}`;
                const bookingCount = bookingCountMap[bookingKey] || 0;

                // Calculate available seats
                const maxSeats = bookingConfig.offerSeats ? bookingConfig.seatsPerSlot : 1;
                const availableSeats = Math.max(0, maxSeats - bookingCount);

                daySlots.push({
                    time: timeStr,
                    totalSeats: maxSeats,
                    bookedSeats: bookingCount,
                    availableSeats: availableSeats,
                    datetime: slotDateTime
                });
            }

            if (daySlots.length > 0) {
                slotsByDate[dateKey] = daySlots;
            }
        }

        // Get all custom slots and merge/override
        const customSlots = await customSlotModel.find({});

        for (const customSlot of customSlots) {
            const { date: dateKey, time, enabled, maxSeats, isCustom } = customSlot;

            // Skip if date is not in our range or if slot is disabled
            if (!slotsByDate[dateKey] && !isCustom) continue;

            // Initialize array if it doesn't exist (for custom dates)
            if (!slotsByDate[dateKey]) {
                slotsByDate[dateKey] = [];
            }

            // Find if this slot already exists
            const existingSlotIndex = slotsByDate[dateKey].findIndex(s => s.time === time);

            if (!enabled) {
                // Remove the slot if it exists and is disabled
                if (existingSlotIndex !== -1) {
                    slotsByDate[dateKey].splice(existingSlotIndex, 1);
                }
            } else {
                // Slot is enabled
                if (existingSlotIndex === -1 && isCustom) {
                    // Add custom slot if it doesn't exist (only for isCustom=true)
                    const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                    if (timeMatch) {
                        let hour = parseInt(timeMatch[1]);
                        const minute = parseInt(timeMatch[2]);
                        const period = timeMatch[3].toUpperCase();

                        if (period === 'PM' && hour !== 12) hour += 12;
                        else if (period === 'AM' && hour === 12) hour = 0;

                        const [day, month, year] = dateKey.split('_').map(Number);
                        const slotDateTime = new Date(year, month - 1, day, hour, minute, 0, 0);

                        // Check if slot is in the past
                        const timeUntilSlot = slotDateTime - now;
                        if (timeUntilSlot < minimumNoticeMs) continue;

                        const bookingKey = `${dateKey}_${time}`;
                        const bookingCount = bookingCountMap[bookingKey] || 0;
                        const availableSeats = Math.max(0, maxSeats - bookingCount);

                        slotsByDate[dateKey].push({
                            time,
                            totalSeats: maxSeats,
                            bookedSeats: bookingCount,
                            availableSeats,
                            datetime: slotDateTime,
                            isCustom: true
                        });
                    }
                } else if (existingSlotIndex !== -1) {
                    // Update existing slot with custom maxSeats (for both custom additions and modified auto-generated slots)
                    const bookingKey = `${dateKey}_${time}`;
                    const bookingCount = bookingCountMap[bookingKey] || 0;
                    slotsByDate[dateKey][existingSlotIndex].totalSeats = maxSeats;
                    slotsByDate[dateKey][existingSlotIndex].availableSeats = Math.max(0, maxSeats - bookingCount);
                }
            }
        }

        // Sort slots by time for each date
        Object.keys(slotsByDate).forEach(dateKey => {
            slotsByDate[dateKey].sort((a, b) => a.datetime - b.datetime);
        });

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

        // Get booking configuration
        let bookingConfig = await bookingConfigModel.findOne();
        if (!bookingConfig) {
            // Create default config if none exists
            bookingConfig = new bookingConfigModel();
            await bookingConfig.save();
        }

        // Check if date is a holiday
        const holiday = await holidayModel.findOne({ date: normalizedDate });
        if (holiday) {
            return res.json({ success: false, message: 'Booking not available on holidays' });
        }

        // Parse date and request date
        const [day, month, year] = normalizedDate.split('_').map(Number);
        const requestDate = new Date(year, month - 1, day);

        // Validate date is within configured availability range (if set)
        if (bookingConfig.startDate && bookingConfig.endDate) {
            const checkDate = new Date(requestDate);
            checkDate.setHours(0, 0, 0, 0);

            const configStartDate = new Date(bookingConfig.startDate);
            configStartDate.setHours(0, 0, 0, 0);

            const configEndDate = new Date(bookingConfig.endDate);
            configEndDate.setHours(23, 59, 59, 999);

            if (checkDate < configStartDate || checkDate > configEndDate) {
                return res.json({
                    success: false,
                    message: 'Selected date is outside the available booking period'
                });
            }
        }

        // Validate that the requested slot is within working hours
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[requestDate.getDay()];
        const dayConfig = bookingConfig.workingHours[dayName];

        if (!dayConfig || !dayConfig.enabled) {
            return res.json({ success: false, message: 'Bookings not available on this day' });
        }

        // Parse the appointment date for time validation
        const appointmentDate = parseSlotDate(normalizedDate);
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

        // Check if this is a custom slot (custom slots can be outside working hours)
        const customSlot = await customSlotModel.findOne({
            date: normalizedDate,
            time: slotTime
        });

        // Validate time is within working hours (skip validation for custom slots)
        if (!customSlot) {
            const [startHour, startMin] = dayConfig.start.split(':').map(Number);
            const [endHour, endMin] = dayConfig.end.split(':').map(Number);
            const slotMinutes = hour * 60 + minute;
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;

            if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
                return res.json({ success: false, message: 'Selected time is outside working hours' });
            }
        } else if (!customSlot.enabled) {
            // Custom slot exists but is disabled
            return res.json({ success: false, message: 'Selected slot is not available' });
        }

        // Calculate minimum notice in milliseconds
        const minimumNoticeMs = calculateNoticeInMs(bookingConfig.minimumNotice, bookingConfig.minimumNoticeUnit);
        const timeUntilAppointment = appointmentDateTime - now;

        if (timeUntilAppointment < minimumNoticeMs) {
            const noticeText = formatNoticeText(bookingConfig.minimumNotice, bookingConfig.minimumNoticeUnit);
            return res.json({
                success: false,
                message: `Appointments must be booked at least ${noticeText} in advance`
            });
        }

        // Check future booking limit
        const futureBookingLimitMs = calculateFutureBookingLimit(
            bookingConfig.limitFutureBookingValue,
            bookingConfig.limitFutureBookingUnit
        );
        if (timeUntilAppointment > futureBookingLimitMs) {
            const limitText = formatNoticeText(
                bookingConfig.limitFutureBookingValue,
                bookingConfig.limitFutureBookingUnit
            );
            return res.json({
                success: false,
                message: `Bookings can only be made up to ${limitText} in advance`
            });
        }

        // Check limit on upcoming bookings per user
        if (bookingConfig.limitUpcomingBookings > 0) {
            const userUpcomingBookings = await appointmentModel.countDocuments({
                patientMobile,
                cancelled: false,
                slotDate: { $gte: normalizedDate }
            });

            if (userUpcomingBookings >= bookingConfig.limitUpcomingBookings) {
                return res.json({
                    success: false,
                    message: `You can only have ${bookingConfig.limitUpcomingBookings} upcoming booking(s) at a time`
                });
            }
        }

        // Count existing bookings for this slot using configured seats
        const existingBookings = await appointmentModel.countDocuments({
            slotDate: normalizedDate,
            slotTime: slotTime,
            cancelled: false
        });

        // Determine max seats: use custom slot's maxSeats if it exists, otherwise use config
        let maxSeats;
        if (customSlot) {
            maxSeats = customSlot.maxSeats;
        } else {
            maxSeats = bookingConfig.offerSeats ? bookingConfig.seatsPerSlot : 1;
        }

        if (existingBookings >= maxSeats) {
            return res.json({ success: false, message: 'Slot Not Available' });
        }

        // Calculate cancellation deadline based on minimum notice
        const cancellationDeadline = new Date(appointmentDateTime);
        cancellationDeadline.setTime(cancellationDeadline.getTime() - minimumNoticeMs);

        // Create appointment with config-based title and description
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
            cancellationDeadline: cancellationDeadline,
            eventTitle: bookingConfig.eventTitle,
            eventDescription: bookingConfig.eventDescription,
            eventDuration: bookingConfig.eventDuration
        };

        const newAppointment = new appointmentModel(appointmentData);
        await newAppointment.save();

        // Create Google Calendar event (non-blocking) and save event ID
        createCalendarEvent(appointmentData)
            .then(async result => {
                if (result.success) {
                    console.log('✅ Google Calendar event created:', result.eventId);
                    // Save the Google Calendar event ID to the appointment
                    newAppointment.googleCalendarEventId = result.eventId;
                    await newAppointment.save();
                } else {
                    console.log('⚠️ Google Calendar event not created:', result.message);
                }
            })
            .catch(err => {
                console.error('❌ Google Calendar error:', err.message);
            });

        // Handle redirect if configured
        const response = {
            success: true,
            message: 'Appointment Booked Successfully',
            appointmentId: newAppointment._id,
            cancellationDeadline: cancellationDeadline
        };

        if (bookingConfig.redirectUrl) {
            response.redirectUrl = bookingConfig.redirectUrl;
        }

        res.json(response);

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

        // Cancel appointment in database
        appointment.cancelled = true;
        await appointment.save();

        // Cancel Google Calendar event (non-blocking)
        if (appointment.googleCalendarEventId) {
            cancelCalendarEvent(appointment.googleCalendarEventId)
                .then(result => {
                    if (result.success) {
                        console.log('✅ Google Calendar event cancelled:', appointment.googleCalendarEventId);
                    } else {
                        console.log('⚠️ Google Calendar event not cancelled:', result.message);
                    }
                })
                .catch(err => {
                    console.error('❌ Google Calendar cancellation error:', err.message);
                });
        } else {
            console.log('⚠️ No Google Calendar event ID found for this appointment');
        }

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