# UI States & Feedback Standards

This document defines the 12 core UI states and interaction patterns across **SocityBYD**. All future screens, components, and forms must adhere to these standards to ensure consistent, premium resident UX.

---

## 1. Empty State
*Applies to: Feed, Food Corner, Complaints, Profile sub-tabs (Posts/Orders/Tickets), Community & DM Chat.*

- **Rule**: Never render a blank screen, silent empty container, or bare null view.
- **Composition**:
  1. **Icon**: Subtle icon (28–36px) centered inside an icon pill/circle with subdued tint (`tokens.textMuted`).
  2. **Title**: Direct, friendly headline (`"No posts yet"`, `"No meal orders placed yet"`).
  3. **Explanation**: 1-line reassuring context (`"Be the first to share an update with your neighbors"`).
  4. **Primary CTA**: Clear action button to trigger creation (`"+ Create Post"`, `"+ Publish Dish"`, `"+ File Complaint"`).

---

## 2. Loading State
*Applies to: Screen hydration, list pagination, detail views.*

- **Rule**: Never show blank white/black flashes or unlabelled full-screen spinning wheels during layout rendering.
- **Implementation**:
  - Render pulsing skeletons (`src/components/Skeleton.tsx`) matching the exact geometry of incoming content cards.
  - Skeletons use 60fps native Reanimated opacity pulsing (`0.35` ↔ `0.85`) on `#1E2532` (dark) / `#E4E4E7` (light) with exact card/avatar `borderRadius`.

---

## 3. Saving State
*Applies to: Edit Profile, Create Post, Place Food Order, File Complaint, Auth forms.*

- **Rule**: Prevent duplicate requests and double-tap race conditions.
- **Implementation**:
  - Immediately disable the submit button on press (`disabled={isSubmitting}`).
  - Swap the button content to an inline `ActivityIndicator` (size="small") paired with action-in-progress copy (`"Saving..."`, `"Publishing..."`, `"Placing order..."`).
  - Keep button dimensions fixed so layout never jumps.

---

## 4. Upload Progress State
*Applies to: Cloudflare R2 media uploads (photos, videos, PDFs).*

- **Rule**: Transparent feedback for background and foreground asset uploads.
- **Implementation**:
  - Display actual numerical progress percentage (`0%` → `100%`) or progress bar via Dynamic Island / Floating Toast (`island.updateUploadProgress(progress)`).
  - Provide a clear **Cancel** option to abort ongoing upload tasks.
  - Show a small square thumbnail preview of the media being uploaded.

---

## 5. Error State
*Applies to: Query fetch failures, mutation network errors, Supabase exceptions.*

- **Rule**: Never surface raw Postgres errors (`PGRST...`), stack traces, or HTTP 500 codes to residents.
- **Implementation**:
  - User-facing plain-English title and explanation:
    - Example: `"Could not load feed. Please check your internet connection."`
  - Prominent `"Try again"` primary button that invokes the relevant `refetch()` function.

---

## 6. No Results State
*Applies to: Chat resident search, Food listings search, Complaints filter.*

- **Rule**: Explicitly distinguish between "Empty DB" (nothing created yet) and "No Search Matches".
- **Implementation**:
  - Display the user's active search query: `"No residents found for 'xyz'"`
  - Provide a 1-tap **"Clear search"** button that resets the search input and restores the full list.

---

## 7. Inline Validation State
*Applies to: Auth inputs (Sign In, Sign Up, Complete Profile, Phone OTP).*

- **Rule**: Highlight errors directly on the offending input rather than only via distant popups.
- **Implementation**:
  - Border transitions to destructive red (`#EF4444`, `borderWidth: 1.5`).
  - Short corrective hint rendered beneath the field (e.g., `"Enter a valid 10-digit mobile number"` or `"Password must be at least 8 characters"`).
  - The error border and hint must clear as soon as the resident corrects the value.

---

## 8. Warning / Confirmation State
*Applies to: Destructive actions (Sign Out, Delete Post, Cancel Order, Close Unsaved Post Draft).*

- **Rule**: Require intentional confirmation before executing destructive operations.
- **Implementation**:
  - Use clear, action-oriented button verbs:
    - `"Yes, Sign Out"` vs. `"Keep Signed In"`
    - `"Discard Post"` vs. `"Keep Editing"`
  - Never use ambiguous labels like `"OK"` or `"Yes"`.

---

## 9. Offline & Reconnecting State
*Applies to: App-wide network disconnects.*

- **Rule**: Gracefully degrade while offline without blocking access to already-cached data.
- **Implementation**:
  - Display a subtle, non-blocking top banner:
    - `"You are offline — showing saved view"`
    - `"Reconnecting..."`
  - Read-only features remain accessible via TanStack Query cache (`staleTime: 5 * 60 * 1000`).

---

## 10. Instant Update & Rollback (Optimistic UI)
*Applies to: Feed post upvotes, dish ordering, complaint upvotes, comment submission.*

- **Rule**: UI responds instantly (< 16ms) to resident touch.
- **Implementation**:
  - Optimistically increment counters and toggle filled states immediately upon tap.
  - If the server rejects or network fails, automatically rollback state to previous values and trigger a discreet toast:
    - `"Upvote failed. Restoring previous state."`

---

## 11. Rate Limit / Cooldown State
*Applies to: SMS OTP resend, Email OTP resend, Forgot Password email dispatch.*

- **Rule**: Enforce strict anti-abuse cooldowns while communicating remaining time clearly.
- **Implementation**:
  - Disable the resend link/button while cooldown is active.
  - Display live ticking second timer: `"Resend code in 28s"`.
  - Re-enable the button with active primary color once the timer hits `0s`.

---

## 12. Mobile Accessibility Floor
*Applies to: All interactive controls, touch targets, and icons across iOS & Android.*

- **Rule**: Touch and visual accessibility are mandatory baselines, not optional additions.
- **Standards**:
  - **Touch Targets**: Minimum `48x48px` tappable footprint on all buttons, tabs, back arrows, and modal close triggers (enforce via `hitSlop` or explicit height/padding).
  - **Contrast**: Text contrast ratio ≥ 4.5:1 against surfaces (`#F5F5F5` on `#000000`, `#111113` on `#FFFFFF`).
  - **Screen Reader Support**: All icon-only touchables must have `accessibilityLabel` (e.g., `accessibilityLabel="Upvote post"`, `accessibilityLabel="Close modal"`).
