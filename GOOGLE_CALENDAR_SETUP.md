# 🗓️ Google Calendar Integration Setup Guide

Complete step-by-step guide to enable Google Calendar integration for automatic appointment syncing.

---

## 📋 Overview

When enabled, this integration will:
- ✅ Automatically create Google Calendar events when appointments are booked
- ✅ Store all appointment details in calendar event description
- ✅ Set popup reminders (1 day before & 1 hour before)
- ✅ Work silently in the background (bookings still work if it fails)

**Note**: Email invitations to patients require Domain-Wide Delegation (advanced setup). Basic integration creates calendar events without sending emails.

**Time Required**: 15-20 minutes  
**Cost**: FREE (Google Calendar API is free)

---

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project (5 minutes)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top
   - Click "NEW PROJECT"
   - Enter project name: `Prescripto-Calendar` (or any name)
   - Click "CREATE"
   - Wait for project creation (takes ~10 seconds)

3. **Select Your Project**
   - Click the project dropdown again
   - Select your newly created project

---

### Step 2: Enable Google Calendar API (2 minutes)

1. **Open API Library**
   - In the left sidebar, click "APIs & Services" → "Library"
   - Or visit: https://console.cloud.google.com/apis/library

2. **Search for Calendar API**
   - In the search box, type: `Google Calendar API`
   - Click on "Google Calendar API"

3. **Enable the API**
   - Click the blue "ENABLE" button
   - Wait for confirmation (~5 seconds)

---

### Step 3: Create Service Account (5 minutes)

1. **Navigate to Service Accounts**
   - Left sidebar: "APIs & Services" → "Credentials"
   - Or visit: https://console.cloud.google.com/apis/credentials

2. **Create Service Account**
   - Click "CREATE CREDENTIALS" at the top
   - Select "Service Account"

3. **Fill Service Account Details**
   - **Service account name**: `prescripto-calendar-bot`
   - **Service account ID**: (auto-filled)
   - **Description**: "Service account for appointment calendar integration"
   - Click "CREATE AND CONTINUE"

4. **Grant Permissions (Optional)**
   - Skip this step - Click "CONTINUE"
   - Skip the next step - Click "DONE"

---

### Step 4: Generate Service Account Key (3 minutes)

1. **Find Your Service Account**
   - You'll see your service account in the list
   - Email format: `prescripto-calendar-bot@your-project.iam.gserviceaccount.com`
   - **⚠️ COPY THIS EMAIL - YOU'LL NEED IT IN STEP 5**

2. **Create Key**
   - Click on your service account email
   - Go to the "KEYS" tab at the top
   - Click "ADD KEY" → "Create new key"

3. **Download Key**
   - Select "JSON" format
   - Click "CREATE"
   - A JSON file will download automatically
   - **⚠️ KEEP THIS FILE SAFE - IT'S YOUR CREDENTIALS**

4. **Rename the Downloaded File**
   - Rename it to: `google-calendar-credentials.json`
   - Move it to your backend folder: `backend/google-calendar-credentials.json`

---

### Step 5: Share Calendar with Service Account (3 minutes)

1. **Open Google Calendar**
   - Go to: https://calendar.google.com/
   - Sign in with the same Google account

2. **Select Calendar**
   - In the left sidebar, find "My calendars"
   - Hover over your main calendar (usually your email)
   - Click the 3 dots (⋮) → "Settings and sharing"

3. **Share Calendar**
   - Scroll down to "Share with specific people"
   - Click "Add people"
   - **Paste the service account email** from Step 4.1:
     ```
     prescripto-calendar-bot@your-project.iam.gserviceaccount.com
     ```
   - Set permission: "Make changes to events"
   - Uncheck "Send email notification"
   - Click "Send"

4. **Get Calendar ID**
   - Scroll down to "Integrate calendar"
   - Find "Calendar ID" (looks like: `your-email@gmail.com` or `abc123...@group.calendar.google.com`)
   - **⚠️ COPY THIS - YOU'LL NEED IT IN STEP 6**

---

### Step 6: Configure Environment Variables (2 minutes)

1. **Open Your `.env` File**
   - Location: `backend/.env`
   - If it doesn't exist, create it

2. **Add These Lines**
   ```env
   # Google Calendar Integration
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-calendar-credentials.json
   GOOGLE_CALENDAR_ID=your-calendar-id@gmail.com
   ```

3. **Replace Values**
   - `GOOGLE_CALENDAR_ID`: Use the Calendar ID from Step 5.4
   - Example:
     ```env
     GOOGLE_CALENDAR_ID=john.doe@gmail.com
     ```

4. **Save the File**

---

### Step 7: Verify File Structure

Make sure your files are in the correct locations:

```
prescripto-web/
├── backend/
│   ├── .env  ← Contains environment variables
│   ├── google-calendar-credentials.json  ← Downloaded from Google Cloud
│   ├── server.js
│   ├── controllers/
│   │   └── bookingController.js  ← Already updated
│   └── utils/
│       └── googleCalendar.js  ← Already updated
```

---

### Step 8: Test the Integration (2 minutes)

1. **Restart Your Backend Server**
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   cd backend
   npm start
   ```

2. **Check Server Logs**
   - Look for any Google Calendar errors
   - If configured correctly, no errors will show

3. **Book a Test Appointment**
   - Open your frontend: http://localhost:5173
   - Book an appointment with:
     - Valid date/time
     - Patient name
     - Patient email (optional, will be stored in event description)
     - Phone number

4. **Verify Success**
   - Check backend console for:
     ```
     ✅ Google Calendar event created: abc123xyz
     ```
   - Open Google Calendar - event should appear with all appointment details

---

## 🔍 Troubleshooting

### Error: "Credentials file not found"
**Solution**: Ensure `google-calendar-credentials.json` is in the `backend/` folder

### Error: "Calendar not found" or "Forbidden"
**Solution**: 
- Make sure you shared the calendar with the service account email
- Verify the Calendar ID is correct in `.env`

### Error: "Invalid grant"
**Solution**: 
- Download a fresh service account key
- Replace the old credentials file

### Calendar events not creating but no errors
**Solution**:
- Check if environment variables are set correctly
- Restart the backend server
- Verify the service account has "Make changes to events" permission

### Want to send email invites to patients?
**Note**: This requires Domain-Wide Delegation setup (advanced)
- Service accounts need additional OAuth configuration
- Requires Google Workspace admin access
- See: https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority

---

## 🎯 Testing Checklist

- [ ] Service account created
- [ ] JSON credentials downloaded and placed in `backend/`
- [ ] Calendar shared with service account email
- [ ] Environment variables added to `.env`
- [ ] Backend server restarted
- [ ] Test appointment booked
- [ ] Event appears in Google Calendar
- [ ] Event contains all patient details in description

---

## 🔐 Security Best Practices

1. **Never commit credentials to Git**
   - Add to `.gitignore`:
     ```
     google-calendar-credentials.json
     .env
     ```

2. **Restrict Service Account Permissions**
   - Only grant Calendar API access
   - Don't give it unnecessary permissions

3. **Use a Dedicated Calendar**
   - Consider creating a separate calendar for appointments
   - Share that specific calendar with the service account

4. **Rotate Keys Periodically**
   - Generate new service account keys every 6-12 months
   - Delete old keys in Google Cloud Console

---

## 📝 Environment Variables Reference

```env
# Required for Google Calendar Integration
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-calendar-credentials.json
GOOGLE_CALENDAR_ID=your-calendar-id@gmail.com

# Optional: Calendar timezone (default: Asia/Kolkata)
# CALENDAR_TIMEZONE=America/New_York
```

---

## 🎨 Calendar Event Details

When an appointment is booked, the calendar event will include:

**Title**: `Appointment - [Patient Name]`

**Description**:
```
Patient: John Doe
Mobile: 1234567890
Email: john@example.com
Address: 123 Main St, City

Notes: Patient has allergy to penicillin
```

**Duration**: 30 minutes (configurable)

**Color**: Blue

**Reminders**:
- Popup: 1 day before
- Popup: 1 hour before

**Attendees**: Not included (requires Domain-Wide Delegation)

---

## ⚙️ Customization Options

### Change Appointment Duration

Edit `backend/utils/googleCalendar.js`:

```javascript
// Default is 30 minutes
endDate.setMinutes(endDate.getMinutes() + 30);

// Change to 60 minutes
endDate.setMinutes(endDate.getMinutes() + 60);
```

### Change Timezone

Edit `backend/utils/googleCalendar.js`:

```javascript
start: {
    dateTime: startDateTime,
    timeZone: 'Asia/Kolkata'  // Change this
}
```

### Change Event Color

Edit `backend/utils/googleCalendar.js`:

```javascript
colorId: '9'  // Blue
```

Available colors:
- 1: Lavender
- 2: Sage
- 3: Grape
- 4: Flamingo
- 5: Banana
- 6: Tangerine
- 7: Peacock
- 8: Graphite
- 9: Blueberry
- 10: Basil
- 11: Tomato

---

## 🆘 Getting Help

**Google Cloud Console**: https://console.cloud.google.com/  
**Google Calendar API Docs**: https://developers.google.com/calendar/api  
**Service Account Guide**: https://cloud.google.com/iam/docs/service-accounts

---

## ✅ Summary

You've successfully set up Google Calendar integration! Now:

1. ✅ All appointments automatically sync to Google Calendar
2. ✅ Complete patient details stored in event description
3. ✅ Automatic popup reminders are set
4. ✅ Your booking system continues working even if Google Calendar fails
5. ✅ You can manage all appointments in one place
6. ℹ️ Email invites to patients require additional setup (Domain-Wide Delegation)

**Next Steps**:
- Test thoroughly with different scenarios
- Monitor backend logs for any issues
- Consider setting up email notifications separately
- Explore Google Calendar API for advanced features

---

**Setup Complete! 🎉**

Your appointments will now automatically appear in Google Calendar.
