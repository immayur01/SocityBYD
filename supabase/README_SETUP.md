# Ashtavinayak Empire (`SocityBYD`) — Backend & Cloudflare R2 Setup Guide

This guide details the exact steps to connect **Supabase** (Auth, Database, Realtime) and **Cloudflare R2** (Media Storage) to the **SocityBYD** React Native / Expo application.

---

## 1. Cloudflare R2 Setup

### Step 1.1: Create an R2 Bucket
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, click **R2 Object Storage** > **Create bucket**.
3. Name your bucket: `society-assets` (or a custom name).
4. Under **Settings** > **Public Access**:
   * **Connect Domain** (e.g., `media.yourdomain.com`) or enable the **R2.dev subdomain**.
   * Note down this public URL base (e.g., `https://pub-xxxx.r2.dev` or `https://media.yourdomain.com`).

### Step 1.2: Configure CORS on the R2 Bucket
In the Cloudflare Dashboard under your bucket > **Settings** > **CORS Policy**, add:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Step 1.3: Create R2 API Tokens
1. In R2 Overview, click **Manage R2 API Tokens** > **Create API Token**.
2. Permissions: **Object Read & Write**.
3. Scope: Apply to `society-assets` (or all buckets).
4. Save the following credentials:
   * **Account ID** (found on the R2 overview page)
   * **Access Key ID**
   * **Secret Access Key**

---

## 2. Supabase Secrets Configuration

Set the Cloudflare R2 credentials as secrets inside your Supabase project using the Supabase CLI:

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref your-supabase-project-ref

# Set Cloudflare R2 Edge Function Secrets
supabase secrets set \
  R2_ACCOUNT_ID="your_cloudflare_account_id" \
  R2_ACCESS_KEY_ID="your_r2_access_key_id" \
  R2_SECRET_ACCESS_KEY="your_r2_secret_access_key" \
  R2_BUCKET_NAME="society-assets" \
  R2_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

> **Note**: If `R2_PUBLIC_URL` is omitted, the function defaults to `https://{R2_BUCKET_NAME}.{R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{key}`.

---

## 3. Deploy the Edge Function

Deploy the presigned URL generation Edge Function:

```bash
supabase functions deploy get-r2-upload-url
```

### How the Pipeline Works:
1. The app requests a presigned `PUT` URL via `supabase.functions.invoke('get-r2-upload-url', ...)`.
2. The Edge Function verifies the user's Supabase Auth JWT in the `Authorization` header.
3. If verified, it returns a 5-minute AWS S3 v4 presigned URL targeting Cloudflare R2.
4. The app uploads the binary blob directly from the device to Cloudflare R2 via HTTP `PUT` (avoiding backend bandwidth bottlenecks).
5. The permanent Cloudflare R2 public URL is returned and saved in Supabase database tables (`posts.media_url`, `complaints.media_url`, `food_listings.image_url`, `messages.media_url`, `profiles.avatar_url`).

---

## 4. Supabase Database & Realtime Setup

Run the project migration to enable all tables, RLS policies, stored procedures, and Realtime publications:

```bash
supabase db push
```
*(Or execute `supabase/migrations/20261119_ashtavinayak_empire_schema.sql` directly in the Supabase SQL Editor).*

Verify that Realtime is active on the tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
```

---

## 5. Client Environment Configuration (`.env`)

In the root of your `SocityBYD` directory, create or update `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 6. Authentication Setup

### 6.1 Google Sign-In
1. In Google Cloud Console, create OAuth 2.0 Client ID Credentials.
2. In Supabase Dashboard > **Authentication** > **Providers** > **Google**:
   * Enable Google.
   * Input **Client ID** and **Client Secret**.
   * Add `ashtavinayak://auth/callback` to **Redirect URLs** in Supabase Authentication settings.

### 6.2 Phone SMS OTP
1. In Supabase Dashboard > **Authentication** > **Providers** > **Phone**:
   * Enable Phone provider (Twilio, MessageBird, or SMS gateway).
2. **Dev Fallback**: If `.env` is unconfigured or SMS fails in testing, entering `123456` activates the built-in development fallback so you can test UI flows without sending live SMS.

---

## 7. Graceful Fallback Mode

When `.env` is omitted or unconfigured:
* The entire app seamlessly runs in **Offline/Demo Mode**.
* Feed posts, food marketplace listings, complaints, and community chat channels load instantly from rich mock seed data (`src/services/mockData.ts`).
* Photo and attachment pickers fallback to local `file://` URIs with image auto-compression intact.
* No crashes occur.
