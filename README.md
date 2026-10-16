# Safar India Cabs — Vercel starter

This is a starter project, not a fully audited production system. It fixes the original demo OTP, browser-only booking history, client-only payment callback, form validation and route-estimate issues by requiring Firebase Phone Auth and server-side Razorpay verification.

## Files
- `index.html` — front end
- `api/create-order.js` — creates Razorpay order server-side and recomputes expected advance
- `api/verify-payment.js` — verifies payment signature/status and saves booking to Firestore using Admin SDK
- `firestore.rules` — client-side reads limited to the signed-in user's bookings

## 1) Create Firebase project
1. Open https://console.firebase.google.com and create a project.
2. Add a Web app; copy its config into `index.html` where `firebaseConfig` is declared.
3. Authentication → Sign-in method → enable Phone.
4. Authentication settings → authorized domains: add `safarindiacabs.com` and `www.safarindiacabs.com` once the domain is connected. SMS quota/billing/region restrictions can apply.
5. Create Cloud Firestore database and deploy `firestore.rules`.
6. For the server API, create a service account JSON in Firebase/Google Cloud IAM. Keep it private. Minify the full JSON into one line and add it as Vercel environment variable `FIREBASE_SERVICE_ACCOUNT_JSON`. Never put it in `index.html` or commit it to GitHub.

## 2) Razorpay
1. Start with Razorpay Test Mode keys.
2. Add Vercel environment variables:
   - `RAZORPAY_KEY_ID` = test/live Key ID
   - `RAZORPAY_KEY_SECRET` = matching Secret (server only)
3. Do not expose `RAZORPAY_KEY_SECRET` in browser code or GitHub.
4. Test successful, failed, cancelled and delayed payments before switching to live keys.
5. The backend verifies the Firebase ID token, Razorpay signature and payment status before saving. Keep the status as pending operator confirmation until you have an actual dispatch/confirmation workflow.

## 3) Deploy on Vercel (free static hosting + functions)
1. Upload these files to a GitHub repository. `index.html` should be in the project root (not inside `public`).
2. In Vercel choose Add New → Project → import repository.
3. Framework preset: Other; build command empty; output directory `.` (or leave default if detected correctly).
4. Add the three environment variables above in Project Settings → Environment Variables. Redeploy after changing them.
5. Test using the generated `*.vercel.app` URL before connecting the domain.

## 4) Connect Wix-bought domain to Vercel
1. Vercel project → Settings → Domains → add both `safarindiacabs.com` and `www.safarindiacabs.com`.
2. Follow the exact DNS records Vercel shows for your domain. Wix → Domains → your domain → DNS records. Replace/add only the records Vercel requests; don't blindly delete email-related MX/TXT records.
3. Choose one canonical domain (apex or www) and set the other to redirect in Vercel.
4. Wait for DNS propagation and Vercel verification/SSL. Domain renewal remains with Wix unless you transfer it.

## 5) Important limitations and next work
- Free hosting does not mean every third-party service is free. Firebase SMS quotas, Razorpay transaction charges, domain renewal and external API rate limits may apply.
- Public Nominatim/OSRM endpoints are community services with usage policies and no uptime guarantee; don't send high-volume traffic to them. Consider a commercial route provider if the business grows.
- Distance is a routing estimate. Fare rules (minimum km, round-trip, local packages, tolls/taxes/parking/driver allowance, cancellation/refund rules) must be confirmed and displayed accurately before taking money.
- This starter currently stores a booking after successful payment verification, but it does not yet implement admin dashboard, driver assignment, refund handling, webhook reconciliation, booking cancellation, privacy policy/terms pages or dispatch notifications.
- Have a developer review access rules, fraud controls, payment webhooks and Indian privacy/tax/legal requirements before live customer payments.
