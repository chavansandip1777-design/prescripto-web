import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        let keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
        const calendarId = process.env.GOOGLE_CALENDAR_ID;
        const base64Credentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64;

        console.log('🗓️ Google Calendar - Starting event creation...');
        console.log('Calendar ID:', calendarId ? '✓ Set' : '✗ Missing');
        console.log('Base64 Credentials:', base64Credentials ? '✓ Set' : '✗ Missing');
        console.log('Key Path from env:', keyPath);

        if (!calendarId) {
            console.log('❌ Google Calendar not configured - GOOGLE_CALENDAR_ID missing');
            return { success: false, message: 'Google Calendar not configured' };
        }

        // Initialize Google Auth - handle both file and base64 credentials
        let auth;

        if (base64Credentials) {
            // Decode base64 credentials (for cloud hosting like Render)
            try {
                const credentialsJSON = Buffer.from(base64Credentials, 'base64').toString('utf8');
                const credentials = JSON.parse(credentialsJSON);

                auth = new google.auth.GoogleAuth({
                    credentials: credentials,
                    scopes: ['https://www.googleapis.com/auth/calendar']
                });
                console.log('✅ Using base64 encoded credentials (cloud hosting)');
            } catch (decodeError) {
                console.error('❌ Error decoding base64 credentials:', decodeError.message);
                return { success: false, message: 'Invalid credentials format' };
            }
        } else if (keyPath) {
            // Resolve the path relative to backend directory
            if (!path.isAbsolute(keyPath)) {
                // Try multiple possible locations
                const possiblePaths = [
                    path.resolve(process.cwd(), keyPath),
                    path.resolve(__dirname, '..', keyPath),
                    path.resolve(__dirname, '../..', keyPath)
                ];

                let foundPath = null;
                for (const testPath of possiblePaths) {
                    console.log('Checking path:', testPath);
                    if (fs.existsSync(testPath)) {
                        foundPath = testPath;
                        console.log('✓ Found credentials file at:', testPath);
                        break;
                    }
                }

                if (foundPath) {
                    keyPath = foundPath;
                } else {
                    console.error('❌ Credentials file not found in any of these locations:');
                    possiblePaths.forEach(p => console.error('  -', p));
                    return { success: false, message: 'Credentials file not found' };
                }
            }

            // Use file path (for local development)
            auth = new google.auth.GoogleAuth({
                keyFile: keyPath,
                scopes: ['https://www.googleapis.com/auth/calendar']
            });
            console.log('✅ Using credentials file from:', keyPath);
        } else {
            console.log('❌ Google Calendar not configured - no credentials found');
            console.log('Set either GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64 or GOOGLE_SERVICE_ACCOUNT_KEY_PATH');
            return { success: false, message: 'Credentials not configured' };
        }

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

/**
 * Cancel/Delete a Google Calendar event
 * @param {string} eventId - The Google Calendar event ID
 * @returns {Promise<Object>} - Success status
 */
export async function cancelCalendarEvent(eventId) {
    try {
        const calendarId = process.env.GOOGLE_CALENDAR_ID;
        const base64Credentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64;
        let keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

        if (!calendarId) {
            console.log('❌ Google Calendar not configured - cannot cancel event');
            return { success: false, message: 'Google Calendar not configured' };
        }

        if (!eventId) {
            console.log('❌ No event ID provided for cancellation');
            return { success: false, message: 'Event ID required' };
        }

        console.log('🗓️ Cancelling calendar event:', eventId);

        // Initialize Google Auth
        let auth;
        
        if (base64Credentials) {
            const credentialsJSON = Buffer.from(base64Credentials, 'base64').toString('utf8');
            const credentials = JSON.parse(credentialsJSON);
            auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/calendar']
            });
        } else if (keyPath) {
            if (!path.isAbsolute(keyPath)) {
                const possiblePaths = [
                    path.resolve(process.cwd(), keyPath),
                    path.resolve(__dirname, '..', keyPath),
                    path.resolve(__dirname, '../..', keyPath)
                ];
                
                for (const testPath of possiblePaths) {
                    if (fs.existsSync(testPath)) {
                        keyPath = testPath;
                        break;
                    }
                }
            }
            
            auth = new google.auth.GoogleAuth({
                keyFile: keyPath,
                scopes: ['https://www.googleapis.com/auth/calendar']
            });
        } else {
            return { success: false, message: 'Credentials not configured' };
        }

        const calendar = google.calendar({ version: 'v3', auth });

        // Delete the event
        await calendar.events.delete({
            calendarId: calendarId,
            eventId: eventId
        });

        console.log('✅ Calendar event cancelled:', eventId);

        return {
            success: true,
            message: 'Calendar event cancelled successfully'
        };

    } catch (error) {
        console.error('❌ Error cancelling calendar event:', error.message);
        
        // If event not found, consider it already deleted
        if (error.message.includes('Not Found') || error.code === 404) {
            return {
                success: true,
                message: 'Event already deleted or not found'
            };
        }
        
        return {
            success: false,
            message: `Calendar error: ${error.message}`
        };
    }
}

