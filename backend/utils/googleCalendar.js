// Google Calendar integration disabled.
// This no-op implementation keeps existing call sites stable while preventing any runtime Google API usage.
export async function createCalendarEvent(_) {
    return { success: false, message: 'Google Calendar disabled' }
}
