# Ashtavinayak Empire (`SocityBYD`) — Production Auth Setup Guide

This guide covers setting up **Google OAuth 2.0** and **Phone SMS OTP (Twilio / MSG91)** with Supabase Auth and Expo.

---

## 1. Google OAuth 2.0 Configuration

### Step 1.1: Google Cloud Console Setup
1. Open the [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create or select your Google Cloud project (e.g. `ashtavinayak-empire`).
3. Click **Create Credentials** > **OAuth Client ID**.
4. Choose **Application type**: **Web application**.
5. Set **Name**: `Ashtavinayak Empire Supabase Web Client`.
6. Under **Authorized redirect URIs**, add the Supabase Auth callback URL:
   ```
   https://fpnaahvyeuahvpuheplw.supabase.co/auth/v1/callback
   ```
7. Click **Create** and copy your **Client ID** and **Client Secret**.

---

### Step 1.2: Supabase Dashboard Google Provider Configuration
1. In your [Supabase Dashboard](https://supabase.com/dashboard/project/fpnaahvyeuahvpuheplw/auth/providers):
   * Navigate to **Authentication** > **Providers** > **Google**.
   * Toggle **Enable Google provider** to ON.
   * Paste your **Client ID** and **Client Secret**.
   * Click **Save**.

2. Under **Authentication** > **URL Configuration**:
   * Set **Site URL**: `ashtavinayak://`
   * Under **Redirect URLs**, add:
     ```
     ashtavinayak://auth/callback
     https://fpnaahvyeuahvpuheplw.supabase.co/auth/v1/callback
     http://localhost:8081
     ```
   * Click **Save**.

---

### Step 1.3: First-Time Google Onboarding Workflow
When a resident signs in with Google for the first time:
1. `WebBrowser.openAuthSessionAsync` signs the resident in via Google account.
2. The app checks whether their `public.profiles` row already has `wing` and `flat_number`.
3. If this is their first sign-in or flat details are missing, they are automatically routed to `app/(auth)/complete-profile.tsx` ("Complete Your Flat Details").
4. Once they select their society Wing (`Wing A`–`Wing L`) and Flat Number, their profile is upserted into `public.profiles` and they enter the society community feed.

---

## 2. Phone SMS OTP Setup (Twilio / MSG91)

Residents can sign up or sign in using their 10-digit Indian mobile number. The app automatically standardizes numbers to E.164 format: `+91${10digits}`.

### Option A: Twilio Setup
1. In the Supabase Dashboard, go to **Authentication** > **Providers** > **Phone**.
2. Toggle **Enable Phone Provider** to ON.
3. Select **Twilio** under SMS Provider.
4. Input your Twilio credentials:
   * **Account SID**
   * **Auth Token**
   * **Twilio Message Service SID** or **Twilio Phone Number**
5. Save changes.

### Option B: MSG91 Setup (India DLT Compliant)
1. Select **MSG91** under SMS Provider.
2. Enter your **Authkey**, **Sender ID** (6-character approved society sender header), and DLT **Template ID**.
3. Save changes.

---

### Step 2.1: Test Phone Numbers (Bypass Real SMS Charges During QA)
To test login flows without consuming live SMS credits:
1. In Supabase Dashboard, go to **Authentication** > **Providers** > **Phone**.
2. Scroll down to **Phone numbers for testing**.
3. Add test numbers and fixed verification codes (e.g., `+919876543210` with code `123456`).

> **Note**: In local development when `EXPO_PUBLIC_SUPABASE_URL` is omitted, the app runs in **Offline/Demo Fallback Mode**, allowing the `123456` code for UI testing. When connected to live Supabase, real SMS verification is strictly enforced.

---

## 3. Summary of Client Environment Keys

Ensure your `.env` contains:

```env
EXPO_PUBLIC_SUPABASE_URL=https://fpnaahvyeuahvpuheplw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
