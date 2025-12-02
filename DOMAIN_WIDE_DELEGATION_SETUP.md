# 🔐 Domain-Wide Delegation Setup Guide

**Advanced Google Calendar Integration - Email Invites to Patients**

---

## ⚠️ Prerequisites

Before starting, ensure you have:

- ✅ **Google Workspace account** (NOT free Gmail)
- ✅ **Super Admin access** to Google Workspace
- ✅ Basic Google Calendar integration already working
- ✅ Service account already created

**Cost**: Requires Google Workspace subscription (~$6-18/month per user)

**Time Required**: 30-45 minutes

**Difficulty**: Advanced

---

## 📋 What is Domain-Wide Delegation?

Domain-Wide Delegation allows your service account to:
- ✅ Send email invites to patients
- ✅ Add attendees to calendar events
- ✅ Act on behalf of users in your organization
- ✅ Access Google Workspace APIs with user permissions

Without it, service accounts can only access resources explicitly shared with them.

---

## 🚀 Step-by-Step Setup

### Step 1: Enable Domain-Wide Delegation in Service Account (10 minutes)

1. **Open Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (e.g., `Prescripto-Calendar`)

2. **Navigate to Service Accounts**
   - Left sidebar: "IAM & Admin" → "Service Accounts"
   - Or visit: https://console.cloud.google.com/iam-admin/serviceaccounts

3. **Edit Your Service Account**
   - Find your service account: `prescripto-calendar-bot@your-project.iam.gserviceaccount.com`
   - Click on it to open details

4. **Enable Domain-Wide Delegation**
   - Click "SHOW ADVANCED SETTINGS" (at bottom)
   - Find "Domain-wide delegation" section
   - Check "Enable Google Workspace Domain-wide Delegation"
   - **Product name for consent screen**: `Prescripto Calendar Integration`
   - Click "SAVE"

5. **Copy the Client ID**
   - You'll see a "Client ID" (long number like: `123456789012345678901`)
   - **⚠️ COPY THIS - YOU'LL NEED IT IN STEP 2**
   - Also called "Unique ID" or "OAuth 2.0 Client ID"

---

### Step 2: Configure Domain-Wide Delegation in Google Workspace (15 minutes)

1. **Open Google Admin Console**
   - Visit: https://admin.google.com/
   - Sign in with your **Google Workspace Super Admin** account
   - ⚠️ This requires admin access - regular users cannot do this

2. **Navigate to API Controls**
   - In the menu (☰), go to: "Security" → "Access and data control" → "API controls"
   - Or visit: https://admin.google.com/ac/owl/domainwidedelegation

3. **Add Domain-Wide Delegation**
   - Scroll to "Domain-wide delegation"
   - Click "MANAGE DOMAIN WIDE DELEGATION"
   - Click "Add new" button

4. **Enter Service Account Details**
   - **Client ID**: Paste the Client ID from Step 1.5
   - **OAuth Scopes**: Enter these scopes (comma or line-separated):
     ```
     https://www.googleapis.com/auth/calendar
     https://www.googleapis.com/auth/calendar.events
     ```
   - Click "AUTHORIZE"

5. **Verify Authorization**
   - You should see your service account in the list
   - Status should show as "Authorized"

---

### Step 3: Update Backend Code for Delegation (10 minutes)

1. **Update Environment Variables**

   Edit `backend/.env` and add:
   ```env
   # Domain-Wide Delegation
   GOOGLE_WORKSPACE_ADMIN_EMAIL=admin@yourdomain.com
   ```
   Replace with the email of a Google Workspace user (can be your admin email or any user in your domain).

2. **Update `backend/utils/googleCalendar.js`**

   Replace the auth initialization section:

   ```javascript
   // OLD CODE (around line 32-36):
   const auth = new google.auth.GoogleAuth({
       keyFile: keyPath,
       scopes: ['https://www.googleapis.com/auth/calendar']
   });

   // NEW CODE:
   const auth = new google.auth.GoogleAuth({
       keyFile: keyPath,
       scopes: [
           'https://www.googleapis.com/auth/calendar',
           'https://www.googleapis.com/auth/calendar.events'
       ],
       // Enable domain-wide delegation
       subject: process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL
   });
   ```

3. **Re-enable Attendees in Events**

   In the same file, find the event creation section (around line 88-104) and update:

   ```javascript
   // OLD CODE:
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
               { method: 'popup', minutes: 24 * 60 },
               { method: 'popup', minutes: 60 }
           ]
       },
       colorId: '9'
   };

   // NEW CODE:
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
       // Add attendees with Domain-Wide Delegation
       attendees: appointmentData.patientEmail ? [
           { 
               email: appointmentData.patientEmail,
               responseStatus: 'needsAction'
           }
       ] : [],
       reminders: {
           useDefault: false,
           overrides: [
               { method: 'email', minutes: 24 * 60 },  // Email reminder
               { method: 'popup', minutes: 60 }
           ]
       },
       colorId: '9',
       // Send email notifications
       sendNotifications: true,
       guestsCanModify: false,
       guestsCanInviteOthers: false,
       guestsCanSeeOtherGuests: false
   };
   ```

4. **Update sendUpdates Parameter**

   Find the calendar.events.insert call (around line 107-111):

   ```javascript
   // OLD CODE:
   const response = await calendar.events.insert({
       calendarId: calendarId,
       resource: event,
       sendUpdates: 'none'
   });

   // NEW CODE:
   const response = await calendar.events.insert({
       calendarId: calendarId,
       resource: event,
       sendUpdates: appointmentData.patientEmail ? 'all' : 'none'
   });
   ```

---

### Step 4: Test Domain-Wide Delegation (5 minutes)

1. **Restart Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Check for Configuration Errors**
   - Look for any authentication errors
   - Verify GOOGLE_WORKSPACE_ADMIN_EMAIL is set

3. **Book Test Appointment**
   - Open frontend: http://localhost:5173
   - Book appointment with:
     - Valid date/time
     - Patient name
     - **Patient email** (use your personal email to test)
     - Phone number

4. **Verify Email Sent**
   - Check backend logs for:
     ```
     ✅ Google Calendar event created: abc123xyz
     ```
   - Check patient's email inbox
   - Should receive calendar invitation email
   - Email will have "Accept/Decline" buttons

5. **Check Google Calendar**
   - Event should show attendee: patient's email
   - Attendee status: "Awaiting response"

---

## 🔍 Troubleshooting

### Error: "Subject (user to impersonate) is not provided"
**Solution**: 
- Ensure `GOOGLE_WORKSPACE_ADMIN_EMAIL` is set in `.env`
- Value should be a valid email in your Google Workspace domain

### Error: "Not Authorized to access this resource/api"
**Solution**:
- Verify Domain-Wide Delegation is configured in Admin Console
- Check OAuth scopes are correct
- Wait 10-15 minutes for changes to propagate

### Error: "Invalid grant: Not a valid email"
**Solution**:
- `GOOGLE_WORKSPACE_ADMIN_EMAIL` must be from your Workspace domain
- Cannot use free Gmail addresses

### Email invites still not sending
**Solution**:
- Verify service account Client ID in Admin Console
- Check scopes exactly match:
  ```
  https://www.googleapis.com/auth/calendar
  https://www.googleapis.com/auth/calendar.events
  ```
- Restart backend server after any changes

### Error: "Delegation denied for this scope"
**Solution**:
- Admin Console might have restricted API access
- Contact your Google Workspace admin
- Check Security → API Controls → API access settings

---

## 🎯 Complete Testing Checklist

- [ ] Google Workspace account verified (not free Gmail)
- [ ] Super Admin access confirmed
- [ ] Domain-Wide Delegation enabled on service account
- [ ] Client ID copied from service account
- [ ] Domain-Wide Delegation configured in Admin Console
- [ ] OAuth scopes authorized
- [ ] `GOOGLE_WORKSPACE_ADMIN_EMAIL` added to `.env`
- [ ] Backend code updated with delegation
- [ ] Backend server restarted
- [ ] Test appointment booked with patient email
- [ ] Patient receives calendar invitation email
- [ ] Email contains Accept/Decline buttons
- [ ] Event shows attendee in Google Calendar

---

## 🔐 Security Considerations

### Important Security Notes

1. **Limited Scope Access**
   - Only grant necessary scopes (calendar only)
   - Don't add Gmail, Drive, or other scopes unless needed

2. **User Impersonation**
   - Service account acts as `GOOGLE_WORKSPACE_ADMIN_EMAIL` user
   - Use a dedicated service account, not personal admin

3. **Audit Logging**
   - Enable audit logs in Admin Console
   - Monitor service account activity

4. **Key Rotation**
   - Rotate service account keys every 90 days
   - Delete old keys after rotation

5. **Restricted Admin**
   - Consider creating a dedicated admin account for API access
   - Limit permissions to calendar management only

---

## 📧 Email Invitation Details

Once configured, patients will receive:

**Subject**: `Invitation: Appointment - [Patient Name] @ [Date] [Time]`

**Email Content**:
- Event title and description
- Date and time
- Location (if set)
- "Yes / No / Maybe" response buttons
- "Add to calendar" link
- Organizer: Your workspace admin email

**Patient Actions**:
- Accept invitation → Added to their calendar
- Decline invitation → You get notification
- Maybe → Tentative acceptance

---

## ⚙️ Advanced Configuration

### Use Different Email for Each Appointment

Instead of a fixed admin email, you can dynamically set the impersonated user:

```javascript
// In bookingController.js, pass doctor email
const calendarResult = await createCalendarEvent({
    ...appointmentData,
    organizerEmail: 'doctor@yourdomain.com'  // Different per doctor
});

// In googleCalendar.js, use it
const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: [...],
    subject: appointmentData.organizerEmail || process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL
});
```

### Add Calendar Location

```javascript
const event = {
    // ... other fields
    location: 'Clinic Name, 123 Main St, City, State',
    // ...
};
```

### Add Conference Call (Google Meet)

```javascript
const event = {
    // ... other fields
    conferenceData: {
        createRequest: {
            requestId: `appointment-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
    },
    // ...
};

// Add conferenceDataVersion parameter
await calendar.events.insert({
    calendarId: calendarId,
    resource: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all'
});
```

---

## 📊 Comparison: Basic vs Domain-Wide Delegation

| Feature | Basic Setup | With Domain-Wide Delegation |
|---------|------------|---------------------------|
| **Account Type** | Free Gmail | Google Workspace |
| **Cost** | Free | ~$6-18/month |
| **Setup Complexity** | Simple | Advanced |
| **Admin Access** | Not required | Required |
| **Calendar Events** | ✅ Yes | ✅ Yes |
| **Email Invites** | ❌ No | ✅ Yes |
| **Attendee Management** | ❌ No | ✅ Yes |
| **Email Reminders** | ❌ No | ✅ Yes |
| **Accept/Decline** | ❌ No | ✅ Yes |
| **User Impersonation** | ❌ No | ✅ Yes |

---

## 🆘 Getting Help

**Google Workspace Admin Help**: https://support.google.com/a/  
**Domain-Wide Delegation Guide**: https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority  
**Calendar API Reference**: https://developers.google.com/calendar/api/v3/reference  
**OAuth 2.0 Scopes**: https://developers.google.com/identity/protocols/oauth2/scopes#calendar

---

## 💡 Alternative: Use OAuth 2.0 User Flow

If you don't want Domain-Wide Delegation, consider:

**OAuth 2.0 User Consent Flow**:
- Each user authorizes your app individually
- No workspace admin needed
- Works with free Gmail accounts
- More complex implementation
- Users must grant permission manually

This requires a different implementation pattern. Let me know if you want a guide for this approach.

---

## ✅ Summary

After completing Domain-Wide Delegation setup:

1. ✅ Patients receive calendar invitation emails
2. ✅ Emails have Accept/Decline/Maybe buttons
3. ✅ Responses tracked in Google Calendar
4. ✅ Attendees added to calendar events
5. ✅ Email reminders sent automatically (via Google)
6. ✅ Professional booking experience
7. ✅ Full Google Calendar integration

**Important**: Requires Google Workspace subscription and Super Admin access.

---

**Setup Complete! 🎉**

Your appointment system now sends professional calendar invitations to patients via email.
