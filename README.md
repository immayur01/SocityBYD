# Ashtavinayak Empire - Residential Society Mobile App

A production-ready, cross-platform (Android & iOS) residential society mobile app built with **Expo (React Native + TypeScript + Expo Router)** featuring deep cosmic dark glassmorphism and native responsiveness.

---

## 🏛️ Features & Architecture

### 1. Visual Identity & Design System
- **Theme**: Deep Cosmic Dark Glassmorphism (`#080813`, `#13122b`, `#261a4f`).
- **Brand Title**: *"ASHTAVINAYAK EMPIRE"* rendered with Cinzel Bold typography and animated metallic shimmer sweep.
- **Glassmorphism**: Semi-transparent dark surfaces (`rgba(28, 25, 52, 0.72)`) with top highlight borders (`rgba(255, 255, 255, 0.18)`).
- **Toast Feedback**: Non-blocking animated in-app toast banner reserved strictly for essential updates (auth, posts, orders, tickets).

### 2. Startup & Authentication Flow
- **3-Second Animated Splash**: 3D-styled society emblem with pulse glow, Cinzel shimmer title, dynamic status loading indicators, and 0% → 100% progress animation routing to saved session.
- **Strict Separation of Sign In vs Sign Up**:
  - **Sign In**: Google Sign In button, Email/Phone switcher, password visibility toggle, "Remember this device" switch.
  - **Sign Up**: Excluded from Google button; requires Full Name, Wing Picker (Wing A to Wing L), Flat Number, 10-digit Indian Mobile Number (+91), Email, Password (8+ chars), and society rules checkbox.
- **6-Digit OTP Verification**: 6 individual numeric boxes with auto-advance and backspace handling, cooldown resend timer, and demo code (`123456`).

### 3. Core Modules & Tabs
- **Main Dashboard & Floating Dock**: Custom liquid glass bottom dock (`BlurView`, `rounded-2xl`, `bottom: 20`) with 4 tabs: `Feed`, `Food`, `Complaints`, `Chat`.
- **Tab 1: 48-Hour Expiring Society Feed**:
  - Live countdown badge (`"Expires in XXh XXm"`).
  - Posts automatically expire 48 hours after creation.
  - Category tags: `Announcement`, `Photo/Video Post`, `Event`.
  - Media support (`expo-image`, `expo-av` videos).
  - Like counter, expandable comments drawer, and native share.
  - Filter toggle: Active Posts vs Expired Archive.
- **Tab 2: Society Food Corner (Home-Cook Marketplace)**:
  - Enables resident home cooks to earn income and neighbors to order hygienic fresh meals.
  - "Cook & Earn" modal: Dish Name, Price (₹), Diet Type (Pure Veg / Non-Veg), Ready Timing, Portions Available, Dish Photo.
  - Dish cards with Veg/Non-Veg symbol, rating, remaining portions, chef & flat info.
  - Order sheet with delivery flat/note, Pay on Delivery, and atomic portion decrementing.
- **Tab 3: Complaints Hub**:
  - Dual-mode segmented switcher:
    1. `Public Community`: Society-wide issues visible to all residents with upvoting so admins prioritize high-impact issues.
    2. `Direct to Admin`: Confidential 1-to-1 tickets visible only to the resident and managing committee.
  - Status badges (`Open`, `In Progress`, `Assigned`, `Resolved`) and official Admin Note box.
- **Tab 4: Full-Screen WhatsApp-Style Chat**:
  - Full-screen view with equal-sized liquid glass Back (`←`) and Close (`✕`) buttons.
  - Pinned circular announcement notice banner.
  - `COMMUNITY` tab (148 members) + `DIRECT MESSAGES` tab (3 unread).
  - WhatsApp canvas theme (`#0b141a`, `#111b21`, `#00a884`, `#005c4b` outgoing green bubbles with `✓✓`, `#1f2c34` incoming bubbles).
  - Interactive emoji reactions (`👍`, `❤️`, `🙏`, `🎉`).
  - Horizontal quick replies (`Noted`, `Order Food`, `Thanks`, `Happy Diwali!`).
  - Keyboard rule compliance: Keyboard sticky view prevents header scrolling off-screen and eliminates flickering on send.
  - 1-on-1 DM chat with online status and real-time bubbles.
- **Resident Profile Screen**:
  - Resident badge, verified status, Wing/Flat details, bio.
  - Inline "Edit Profile" modal.
  - Sub-tabs: `My Posts`, `My Orders`, `My Tickets`.
  - Sign Out action.

---

## 🗄️ Database & Supabase Migration

The complete production PostgreSQL migration script with Row Level Security (RLS) is located at:
`supabase/migrations/20261119_ashtavinayak_empire_schema.sql`

Tables created:
- `profiles`
- `posts`, `post_likes`, `post_comments`
- `food_listings`, `food_orders` (with atomic `place_food_order` function)
- `complaints`, `complaint_upvotes` (with atomic `toggle_complaint_upvote` function)
- `messages` (Realtime publication enabled)

---

## 🚀 Running the Project

1. **Install dependencies** (if starting fresh):
   ```bash
   npm install
   ```

2. **Run TypeScript check**:
   ```bash
   npm run typecheck
   ```

3. **Start the Expo development server**:
   ```bash
   npx expo start
   ```

4. **Run on Android / iOS / Web**:
   ```bash
   npx expo start --android
   npx expo start --ios
   npx expo start --web
   ```
