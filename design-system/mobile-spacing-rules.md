# Mobile UI Spacing & Sizing Standards (8pt Grid)

This document defines the strict 8-point grid and layout metrics for all mobile screens in **SocityBYD**. All components, modals, and screen layouts must conform to these dimensions.

---

## 1. Core Spacing Scale (8pt Grid System)
| Token | Pixels | Usage |
|---|---|---|
| `space-1` | `4px` | Fine-grain micro-adjustments, icon-to-label gaps, badges |
| `space-2` | `8px` | Tight gap (tag padding, chip gaps, small item gap) |
| `space-3` | `12px` | Moderate gap (list-item avatar-to-text gap, action button gap) |
| `space-4` | `16px` | Standard spacing (screen horizontal padding, card internal padding) |
| `space-5` | `20px` | Large spacing (card internal padding for primary cards, section gap) |
| `space-6` | `24px` | Generous container spacing, modal content padding |
| `space-8` | `32px` | Section divider rhythm, header spacing |

---

## 2. Component Sizing & Target Standards
- **Primary / Secondary Touch Targets**:
  - Minimum button height: `48px`–`52px` (Apple Human Interface Guidelines & Material touch target compliance: >= 48dp).
  - Minimum input height: `48px`–`50px`.
  - Full-width CTA buttons: `width: '100%'`, `alignSelf: 'stretch'`, `minHeight: 48` or `50`, `borderRadius: 14` or `16`.
- **Card Styling**:
  - Internal padding: `16px` (compact cards) to `20px` (hero / profile / detail cards).
  - Border radius: `16px` to `20px`.
  - Border width: `1px` subtle hairline (`tokens.borderSubtle`).
- **Avatar & Identity Specifications**:
  - **Profile Screen Hero DP**:
    - Size: `84x84` circle.
    - Outer border ring: `2px` (`tokens.borderSubtle` or matching theme border).
    - Camera / Edit badge: `28x28` circle positioned at `bottom: -2, right: -2`, border: `2px` app background, centered camera icon (`14px`).
    - Avatar-to-Text gap: `18px` (`gap: 18`, `marginLeft: 18` fallback) so text never touches or crowds the avatar.
  - **Feed / Chat / Directory List Avatars**:
    - Size: `36x36` (feed post author, comments) to `48x48` (chat thread item).
    - Avatar-to-Text gap: `12px` minimum.

---

## 3. Screen Layout Rhythm
- **Horizontal Screen Padding**: `16px` across all tabs and auth views.
- **Section-to-Section Rhythm**: `16px`–`20px` vertical gap.
- **Badges & Role Pills**:
  - Height: `22px`–`24px`.
  - Padding: `paddingHorizontal: 8px`, `paddingVertical: 3px`.
  - Radius: `6px`–`8px`.
  - Font size: `11px`, `fontWeight: '600'`, uppercase with `letterSpacing: 0.5`.
