Deployment checklist for Render and local builds

This document provides exact, copy-pasteable steps to deploy the project to Render (backend web service + two static sites) and to build the static sites locally.

Important notes before you start

- Do NOT commit secrets (like MONGODB_URI) to the repo. Set them in the Render dashboard for the backend service.
- `VITE_BACKEND_URL` must be set at build time for the frontend/admin static builds. The static bundles are built with Vite and embed that URL.
- If your MongoDB is on Atlas, you must allow Render outbound connections in Atlas Network Access (IP whitelist). For quick tests you can add `0.0.0.0/0` temporarily; remove it afterward and apply a secure approach.

Local build & test (Windows PowerShell)

1. Build frontend and admin static sites locally (PowerShell):

```powershell
# From project root
cd frontend
npm ci
npm run build
cd ..\admin
npm ci
npm run build
cd ..
# Optionally run the backend locally and serve the built static files
cd backend
npm ci
node server.js
```

- The backend `server.js` is configured to serve `frontend/dist` and `admin/dist` if present in the repo, so running the backend locally will serve those builds.
- Visit http://localhost:4000/appointment/<docId> and http://localhost:4000/admin-dashboard to verify deep links and booking flow.

PowerShell helper script

- A helper script `scripts\build_all.ps1` is provided to run the above commands in sequence on Windows. Run from the repo root:

```powershell
.\scripts\build_all.ps1
```

Render deployment (recommended: use render.yaml)

1. Ensure `render.yaml` is present (it is already in this repo). It defines three services:

   - `prescripto-backend` (type: web)
   - `prescripto-frontend` (type: static_site)
   - `prescripto-admin` (type: static_site)

2. Backend env vars (Render dashboard)

   - Open your backend service in Render dashboard.
   - Under Environment → Environment Variables, add the following secrets (paste exact values from your local `.env` but DO NOT commit them):
     - `MONGODB_URI` = mongodb+srv://<user>:<pass>@.../prescripto?...
     - `JWT_SECRET` = <your_jwt_secret>
     - `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` / `CLOUDINARY_CLOUD_NAME` as needed
     - `STRIPE_SECRET_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` etc.
   - Save and trigger a Manual Deploy.

3. Atlas IP access (if using Atlas)

   - If the backend fails with `MongooseServerSelectionError` or TLS handshake errors, go to MongoDB Atlas → Network Access and:
     - Add an IP access entry: `0.0.0.0/0` (temporary) and wait ~1 minute for propagation.
     - Redeploy the backend on Render. If it connects, the issue was IP whitelist; you can then choose a secure long-term option (see below) and remove the `0.0.0.0/0` entry.

4. Configure the static sites to use the backend

   - For both `prescripto-frontend` and `prescripto-admin` in Render:
     - Ensure the service is type `Static Site` (not Web Service).
     - Environment variables:
       - `VITE_BACKEND_URL` = https://<your-backend-url> (for example: https://prescripto-web-xa6u.onrender.com)
     - Build Commands (render.yaml already sets these):
       - Frontend: `cd frontend && npm ci && npm run build`
       - Admin: `cd admin && npm ci && npm run build`
     - Publish directories:
       - Frontend: `frontend/dist`
       - Admin: `admin/dist`
   - Save and trigger Manual Deploy for each static site.

5. Verify deployments
   - Backend logs should show: `MongoDB connection established` and `Server started on PORT:...`.
   - Open the frontend and admin URLs and test deep links (refresh the page) and booking flows.
   - If admin CSS appears as `text/plain`, re-check the service type (must be Static Site). Recreate as Static Site if needed.

Post-deploy secure options (recommended)

- Replace the temporary Atlas `0.0.0.0/0` rule with one of the following:
  - Use Atlas Private Endpoint / VPC peering (recommended for production).
  - Use a small proxy in the same cloud region as Atlas.
  - If Render provides static outbound CIDRs for your plan, add them to Atlas access list.

Debugging checks (PowerShell commands you can run locally)

- Check backend root:

```powershell
Invoke-WebRequest 'https://<your-backend-url>/' -UseBasicParsing
```

- Inspect CSS asset headers:

```powershell
$r = Invoke-WebRequest 'https://<your-admin-url>/assets/index-*.css' -UseBasicParsing -Method GET
$r.Headers['content-type']
```

If something still fails, paste the backend Render logs and the two header results above and I will diagnose further.

---

If you'd like, I can also add a small `README_RENDER.md` with screenshots and the exact button clicks in Render's UI. Let me know.
