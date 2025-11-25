import mongoose from 'mongoose';
import dotenv from 'dotenv';
import slotModel from './models/slotModel.js';
import holidayModel from './models/holidayModel.js';
import connectDB from './config/mongodb.js';

dotenv.config();

// Helper to format date as DD_MM_YYYY
const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}_${month}_${year}`;
};

// Helper to format time as 12-hour format
const formatTime = (hour, minute) => {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
};

const seedSlots = async () => {
    try {
        console.log('Connecting to database...');
        await connectDB();
        console.log('✅ Database connected');

        // Clear existing slots
        await slotModel.deleteMany({});
        console.log('Cleared existing slots');

        // Get holidays to skip them
        const holidays = await holidayModel.find({});
        const holidayDates = new Set(holidays.map(h => h.date));

        const slots = [];
        const today = new Date();

        // Create slots for next 60 days
        for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
            const date = new Date(today);
            date.setDate(today.getDate() + dayOffset);

            // Skip weekends (Saturday = 6, Sunday = 0)
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            const dateKey = formatDate(date);

            // Skip holidays
            if (holidayDates.has(dateKey)) continue;

            // Create slots from 10:00 AM to 5:00 PM (30-minute intervals)
            for (let hour = 10; hour < 17; hour++) {
                for (let minute of [0, 30]) {
                    const time = formatTime(hour, minute);

                    slots.push({
                        date: dateKey,
                        time: time,
                        maxSeats: 1,
                        isEnabled: true
                    });
                }
            }
        }

        // Insert slots
        await slotModel.insertMany(slots);

        console.log(`✅ Successfully created ${slots.length} slots`);
        console.log('📅 Slots created for next 60 weekdays (excluding weekends and holidays)');
        console.log('⏰ Time: 10:00 AM - 5:00 PM (30-minute intervals)');
        console.log('💺 Max seats per slot: 1');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding slots:', error);
        process.exit(1);
    }
};

seedSlots();
