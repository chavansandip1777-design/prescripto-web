import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

/**
 * Create a Google Calendar event for an appointment
 * @param {Object} appointmentData - The appointment details
 * @param {string} appointmentData.patientName - Patient's name
 * @param {string} appointmentData.patientEmail - Patient's email (optional)
 * @param {string} appointmentData.patientMobile - Patient's mobile number
 * @param {string} appointmentData.patientAddress - Patient's address (optional)
 * @param {string} appointmentData.notes - Additional notes (optional)
 * @param {string} appointmentData.slotDate - Appointment date in DD_MM_YYYY format
 * @param {string} appointmentData.slotTime - Appointment time (e.g., "10:00 AM")
 * @returns {Promise<Object>} - Success status and event details or error message
 */
export async function createCalendarEvent(appointmentData) {
    try {
        // Check if Google Calendar is enabled
        const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
        const calendarId = process.env.GOOGLE_CALENDAR_ID;

        if (!keyPath || !calendarId) {
            console.log('Google Calendar not configured - skipping event creation');
            return { success: false, message: 'Google Calendar not configured' };
        }

        // Check if credentials file exists
        if (!fs.existsSync(keyPath)) {
            console.error('Google service account key file not found:', keyPath);
            return { success: false, message: 'Credentials file not found' };
        }

        // Initialize Google Auth
        const auth = new google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: ['https://www.googleapis.com/auth/calendar']
        });

        const calendar = google.calendar({ version: 'v3', auth });

        // Parse the appointment date and time
        const [day, month, year] = appointmentData.slotDate.split('_').map(Number);
        const appointmentDate = new Date(year, month - 1, day);

        // Parse time (format: "HH:MM AM/PM")
        const timeMatch = appointmentData.slotTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!timeMatch) {
            return { success: false, message: 'Invalid time format' };
        }

        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();

        // Convert to 24-hour format
        if (period === 'PM' && hour !== 12) {
            hour += 12;
        } else if (period === 'AM' && hour === 12) {
            hour = 0;
        }

        // Set appointment start time
        appointmentDate.setHours(hour, minute, 0, 0);
        const startDateTime = appointmentDate.toISOString();

        // Set appointment end time (30 minutes duration by default)
        const endDate = new Date(appointmentDate);
        endDate.setMinutes(endDate.getMinutes() + 30);
        const endDateTime = endDate.toISOString();

        // Build event description
        let description = `Patient: ${appointmentData.patientName}\n`;
        description += `Mobile: ${appointmentData.patientMobile}\n`;
        if (appointmentData.patientEmail) {
            description += `Email: ${appointmentData.patientEmail}\n`;
        }
        if (appointmentData.patientAddress) {
            description += `Address: ${appointmentData.patientAddress}\n`;
        }
        if (appointmentData.notes) {
            description += `\nNotes: ${appointmentData.notes}`;
        }

        // Create the event
        const event = {
            summary: `Appointment - ${appointmentData.patientName}`,
            description: description,
            start: {
                dateTime: startDateTime,
                timeZone: 'Asia/Kolkata'
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'Asia/Kolkata'
            },
            // Note: Service accounts cannot invite attendees without Domain-Wide Delegation
            // Attendees feature disabled to avoid API errors
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 24 * 60 }, // 1 day before
                    { method: 'popup', minutes: 60 }        // 1 hour before
                ]
            },
            colorId: '9' // Blue color
        };

        // Insert event into calendar
        const response = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
            sendUpdates: 'none' // Don't send email notifications
        });

        console.log('Google Calendar event created:', response.data.id);

        return {
            success: true,
            eventId: response.data.id,
            eventLink: response.data.htmlLink,
            message: 'Calendar event created successfully'
        };

    } catch (error) {
        console.error('Error creating Google Calendar event:', error.message);
        return {
            success: false,
            message: `Calendar error: ${error.message}`
        };
    }
}
