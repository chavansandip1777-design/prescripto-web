import express from 'express';
import { createCalendarEvent } from '../utils/googleCalendar.js';

const router = express.Router();

// Test endpoint to check Google Calendar configuration
router.get('/calendar-config', async (req, res) => {
    try {
        const config = {
            hasCalendarId: !!process.env.GOOGLE_CALENDAR_ID,
            hasBase64Credentials: !!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64,
            hasKeyPath: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
            calendarId: process.env.GOOGLE_CALENDAR_ID ? 'Set (hidden)' : 'Not set',
            base64Length: process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64?.length || 0,
            keyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'Not set'
        };

        // Try to create a test event
        const testData = {
            patientName: 'Test Patient - Config Check',
            patientEmail: 'test@example.com',
            patientMobile: '1234567890',
            patientAddress: 'Test Address',
            notes: 'Automated configuration test',
            slotDate: '10_12_2025',
            slotTime: '02:00 PM'
        };

        const result = await createCalendarEvent(testData);

        res.json({
            status: result.success ? 'SUCCESS' : 'FAILED',
            configuration: config,
            testResult: result,
            recommendation: result.success 
                ? '✅ Google Calendar is properly configured!' 
                : '❌ Check the configuration details above and follow RENDER_GOOGLE_CALENDAR_SETUP.md'
        });
    } catch (error) {
        res.json({
            status: 'ERROR',
            error: error.message,
            stack: error.stack
        });
    }
});

export default router;
