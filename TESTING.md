Manual validation steps

1. Start backend

   - cd backend
   - npm install
   - set .env values (MONGODB_URI, JWT_SECRET, etc.). For local admin login add ADMIN_EMAIL=admin@gmail.com and ADMIN_PASSWORD=12345
   - OPTIONAL: enable Google Calendar by setting GOOGLE_SERVICE_ACCOUNT_KEY_PATH and GOOGLE_CALENDAR_ID
   - npm run server

2. Start frontend and admin

   - cd frontend
   - npm install
   - npm run dev
   - cd ../admin
   - npm install
   - npm run dev

3. Admin settings

   - Open admin app. Login with admin@gmail.com / 12345
   - Go to Settings and change Active Days, Seats per Half Hour. Save.

4. Frontend booking
   - Open doctor appointment page (e.g. /appointment/:docId)
   - Verify displayed days equal Active Days set in admin
   - Verify each slot shows available seats
   - Book a slot as guest and confirm redirection to booking confirmation
   - Check backend: appointment created and doctor.slots_booked updated; if Google Calendar enabled, appointment has calendarEventId

Notes on concurrency and data model

- Bookings now use an atomic database increment ($inc) for the nested slots_booked.<date>.<time> key to reduce race conditions.
- The code migrates legacy array-format `slots_booked[date]` into a counts map on first write.
- For extremely high concurrency we recommend a separate Slot collection and transactions.

Next steps / Automated tests

- Add unit tests for booking/cancellation and the availability endpoint.
- Add integration test to exercise the full booking flow with a test DB.
