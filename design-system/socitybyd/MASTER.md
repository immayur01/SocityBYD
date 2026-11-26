# SocityBYD Design System — Master Specification

> **Source of Truth:** Pure-black & neutral graphite design system for SocityBYD mobile application.

---

## 1. Visual Hierarchy & Surface Ramp

| Surface Layer | Dark Hex | Light Hex | Usage |
|---|---|---|---|
| **Canvas / Background** | `#000000` | `#F5F5F7` | Root app background, persistent viewport base |
| **Primary Cards** | `#111113` | `#FFFFFF` | Feed cards, complaint cards, order cards |
| **Elevated Modals / Sheets** | `#121214` | `#FFFFFF` | Bottom sheets, modal dialogs, full-screen composers |
| **Elevated Controls & Inputs** | `#18181B` | `#F4F4F5` | TextInputs, chips, search bars, admin response blocks |
| **Interactive Stepped Pills** | `#1C1C1E` | `#E4E4E7` | Disabled CTA pills, secondary buttons, unvoted chips |
| **Persistent Dock Bar** | `#0E0E10` | `#F8F8FA` | Persistent bottom tab bar |

---

## 2. Hairlines & Dividers

- **Subtle Top / Card Borders:** `rgba(255, 255, 255, 0.08)` (dark mode) / `rgba(0, 0, 0, 0.08)` (light mode)
- **Active / Focused Hairlines:** `rgba(255, 255, 255, 0.12)` to `0.15`
- **Internal Separators / Dividers:** `rgba(255, 255, 255, 0.06)`

---

## 3. Typography & Text Hierarchy

| Role | Dark Color | Light Color | Weight | Size |
|---|---|---|---|---|
| **Primary Text / Headings** | `#FFFFFF` / `#F5F5F5` | `#111113` | `600` | `15px`–`18px` |
| **Secondary Text / Body** | `#A1A1AA` | `#4B5563` | `400`–`500` | `13px`–`14px` |
| **Muted Metadata / Timestamps**| `#71717A` | `#8E8E93` | `400` | `11px`–`12px` |
| **Monospace / Unit Identifiers**| `#E4E4E7` | `#18181B` | `500`–`600` | `11px` (`tabular-nums`) |

---

## 4. Primary & Secondary CTAs

- **Primary Button (`Next`, `Share`, `Publish`, `File Ticket`):**
  - Enabled: `#FFFFFF` fill with `#09090B` text (dark mode) / `#09090B` fill with `#FFFFFF` text (light mode). Height: `34px`–`36px`, `paddingHorizontal: 16px`, `borderRadius: 10px`–`18px`.
  - Disabled: `#1C1C1E` fill with `1px solid rgba(255, 255, 255, 0.12)` and `#6E6E73` text (zero opacity dimming).
- **Secondary / Ghost Action:**
  - `#18181B` fill with `rgba(255, 255, 255, 0.08)` border, `#D4D4D8` text.

---

## 5. Semantic Status Dots (No Glowing Pills)

Instead of colored badges, use quiet **6px circular status dots** paired with clean muted text:
- **Success / Resolved / Active:** `#22C55E`
- **Warning / In Progress / Pending:** `#EAB308`
- **Danger / Urgent:** `#EF4444`
- **Muted / Assigned / Open:** `#71717A`

---

## 6. Spacing & 4px Grid

- All paddings, margins, icon gaps, and row heights strictly adhere to the 4px grid (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`).
- Safe areas: persistent tab bar height is `52px + Math.max(insets.bottom, 12px)`. List containers pad bottom dynamically by this amount.
