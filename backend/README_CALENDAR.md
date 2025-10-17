Google Calendar integration (optional)

This project can optionally create Google Calendar events when an appointment is booked. To enable this feature you must provide a Google service account JSON key and a calendar ID in environment variables.

Environment variables (optional):

- GOOGLE_SERVICE_ACCOUNT_KEY_PATH: absolute or relative path to the service account JSON file.
- GOOGLE_CALENDAR_ID: the calendar id where events should be created (for example a primary calendar or a shared calendar id).

If these variables are not set, appointment booking will continue to work as before and no calendar events will be created.

Note: service account must have access to the target calendar (share calendar with the service account email or use a calendar owned by the service account).

Admin credentials for local testing (do not use in production):

- ADMIN_EMAIL=admin@gmail.com
- ADMIN_PASSWORD=12345
