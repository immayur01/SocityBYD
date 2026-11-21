import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  ClipPath,
  Rect,
  Circle,
  G,
  Path,
  Polygon,
} from 'react-native-svg';

interface AppLogoProps {
  size?: number;
  /** Force a specific theme instead of reading system preference */
  forceDark?: boolean;
  forceLight?: boolean;
}

/**
 * Ashtavinayak Empire — App Logo
 * Glass squircle background with Ganesha emblem.
 * Gold gradient in light mode, white monochrome in dark mode.
 */
export function AppLogo({ size = 100, forceDark, forceLight }: AppLogoProps) {
  const scheme = useColorScheme();
  const isDark = forceDark ?? (forceLight ? false : scheme === 'dark');

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        {/* ── Gold logo gradient ── */}
        <LinearGradient id="al_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FDE68A" />
          <Stop offset="50%"  stopColor="#F59E0B" />
          <Stop offset="100%" stopColor="#B45309" />
        </LinearGradient>

        {/* ── Light-mode orbs ── */}
        <RadialGradient id="al_amberOrb" cx="30%" cy="25%" r="55%">
          <Stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.45" />
          <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="al_skyOrb" cx="75%" cy="80%" r="55%">
          <Stop offset="0%"   stopColor="#38BDF8" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </RadialGradient>

        {/* ── Dark-mode orbs ── */}
        <RadialGradient id="al_silverOrb" cx="28%" cy="22%" r="55%">
          <Stop offset="0%"   stopColor="#94A3B8" stopOpacity="0.45" />
          <Stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="al_blueOrb" cx="76%" cy="80%" r="55%">
          <Stop offset="0%"   stopColor="#38BDF8" stopOpacity="0.30" />
          <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </RadialGradient>

        {/* ── Glass surface (light) ── */}
        <LinearGradient id="al_lSurface" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.28" />
          <Stop offset="45%"  stopColor="#FFFFFF" stopOpacity="0.10" />
          <Stop offset="100%" stopColor="#0F172A"  stopOpacity="0.32" />
        </LinearGradient>
        <LinearGradient id="al_lGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.38" />
          <Stop offset="35%"  stopColor="#FFFFFF" stopOpacity="0.06" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="al_lRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.75" />
          <Stop offset="50%"  stopColor="#FFFFFF" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#FDE68A" stopOpacity="0.45" />
        </LinearGradient>

        {/* ── Glass surface (dark) ── */}
        <LinearGradient id="al_dSurface" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.30" />
          <Stop offset="45%"  stopColor="#FFFFFF" stopOpacity="0.11" />
          <Stop offset="100%" stopColor="#090D16"  stopOpacity="0.35" />
        </LinearGradient>
        <LinearGradient id="al_dGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.42" />
          <Stop offset="35%"  stopColor="#FFFFFF" stopOpacity="0.06" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="al_dRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.80" />
          <Stop offset="50%"  stopColor="#FFFFFF" stopOpacity="0.20" />
          <Stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.45" />
        </LinearGradient>

        {/* ── Squircle clip ── */}
        <ClipPath id="al_clip">
          <Rect x="24" y="24" width="464" height="464" rx="108" />
        </ClipPath>
      </Defs>

      {/* ── Glass squircle background ── */}
      <G clipPath="url(#al_clip)">
        {/* Base fill */}
        <Rect
          x="24" y="24" width="464" height="464"
          fill={isDark ? '#090D16' : '#0F172A'}
          fillOpacity={isDark ? 0.62 : 0.55}
        />

        {/* Ambient orbs (no blur in RN SVG — rendered at reduced opacity for similar effect) */}
        <Circle
          cx="150" cy="140" r="210"
          fill={isDark ? 'url(#al_silverOrb)' : 'url(#al_amberOrb)'}
          opacity={0.9}
        />
        <Circle
          cx="370" cy="390" r="220"
          fill={isDark ? 'url(#al_blueOrb)' : 'url(#al_skyOrb)'}
          opacity={0.9}
        />

        {/* Glass surface overlay */}
        <Rect
          x="24" y="24" width="464" height="464"
          fill={isDark ? 'url(#al_dSurface)' : 'url(#al_lSurface)'}
        />

        {/* Top gloss */}
        <Rect
          x="24" y="24" width="464" height="232"
          fill={isDark ? 'url(#al_dGloss)' : 'url(#al_lGloss)'}
        />
      </G>

      {/* ── Specular rim ── */}
      <Rect
        x="24" y="24" width="464" height="464" rx="108"
        fill="none"
        stroke={isDark ? 'url(#al_dRim)' : 'url(#al_lRim)'}
        strokeWidth="2.5"
      />
      <Rect
        x="26.5" y="26.5" width="459" height="459" rx="105.5"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.16"
        strokeWidth="1"
      />

      {/* ── Ganesha logo ── */}
      <G transform="translate(0, 6)">
        {isDark ? (
          /* White monochrome — dark mode */
          <G
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M 206 168 L 206 136 L 256 98 L 306 136 L 306 168" strokeLinejoin="miter" />
            <Polygon points="256,122 267,131 267,144 245,144 245,131" fill="#FFFFFF" stroke="none" />
            <Path d="M 218 176 Q 256 144 294 176" />
            <Path
              d="M 256 176 C 256 176, 248 194, 248 201 A 8 8 0 0 0 264 201 C 264 194, 256 176, 256 176 Z"
              fill="#FFFFFF" stroke="none"
            />
            <Path d="M 216 196 C 188 182, 162 180, 146 182 C 154 214, 154 248, 174 264 C 194 278, 212 262, 206 238 L 206 218" />
            <Path d="M 296 196 C 324 182, 350 180, 366 182 C 358 214, 358 248, 338 264 C 318 278, 300 262, 306 238 L 306 218" />
            <Path d="M 218 218 Q 228 212 236 220 Q 227 226 218 218 Z" fill="#FFFFFF" stroke="none" />
            <Path d="M 294 218 Q 284 212 276 220 Q 285 226 294 218 Z" fill="#FFFFFF" stroke="none" />
            <Path d="M 224 262 L 214 274" strokeWidth="10" />
            <Path d="M 288 262 L 298 274" strokeWidth="10" />
            <Path d="M 216 196 C 242 212, 246 244, 246 276 C 246 318, 276 346, 314 334 C 304 354, 268 360, 248 338 C 232 320, 232 288, 232 262" />
            <Path d="M 296 196 C 270 212, 266 244, 266 274 C 266 298, 282 318, 304 316" />
            <Path d="M 204 294 C 170 280, 146 306, 154 338 C 162 370, 204 388, 240 390" />
            <Path d="M 308 294 C 342 280, 366 306, 358 338 C 350 370, 304 386, 276 382 C 260 380, 250 390, 248 402 C 268 402, 284 392, 296 382" />
          </G>
        ) : (
          /* Gold gradient — light mode */
          <G>
            <Path
              d="M 206 168 L 206 136 L 256 98 L 306 136 L 306 168"
              fill="none" stroke="url(#al_gold)" strokeWidth="11" strokeLinejoin="miter"
            />
            <Polygon points="256,122 267,131 267,144 245,144 245,131" fill="url(#al_gold)" />
            <Path
              d="M 218 176 Q 256 144 294 176"
              fill="none" stroke="url(#al_gold)" strokeWidth="11" strokeLinecap="round"
            />
            {/* Red tilak / water drop */}
            <Path
              d="M 256 176 C 256 176, 248 194, 248 201 A 8 8 0 0 0 264 201 C 264 194, 256 176, 256 176 Z"
              fill="#DC2626"
            />
            <Path
              d="M 216 196 C 188 182, 162 180, 146 182 C 154 214, 154 248, 174 264 C 194 278, 212 262, 206 238 L 206 218"
              fill="none" stroke="url(#al_gold)" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round"
            />
            <Path
              d="M 296 196 C 324 182, 350 180, 366 182 C 358 214, 358 248, 338 264 C 318 278, 300 262, 306 238 L 306 218"
              fill="none" stroke="url(#al_gold)" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round"
            />
            <Path d="M 218 218 Q 228 212 236 220 Q 227 226 218 218 Z" fill="url(#al_gold)" />
            <Path d="M 294 218 Q 284 212 276 220 Q 285 226 294 218 Z" fill="url(#al_gold)" />
            <Path
              d="M 224 262 L 214 274"
              fill="none" stroke="url(#al_gold)" strokeWidth="9" strokeLinecap="round"
            />
            <Path
              d="M 288 262 L 298 274"
              fill="none" stroke="url(#al_gold)" strokeWidth="9" strokeLinecap="round"
            />
            <Path
              d="M 216 196 C 242 212, 246 244, 246 276 C 246 318, 276 346, 314 334 C 304 354, 268 360, 248 338 C 232 320, 232 288, 232 262"
              fill="none" stroke="url(#al_gold)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"
            />
            <Path
              d="M 296 196 C 270 212, 266 244, 266 274 C 266 298, 282 318, 304 316"
              fill="none" stroke="url(#al_gold)" strokeWidth="11" strokeLinecap="round"
            />
            <Path
              d="M 204 294 C 170 280, 146 306, 154 338 C 162 370, 204 388, 240 390"
              fill="none" stroke="url(#al_gold)" strokeWidth="11" strokeLinecap="round"
            />
            <Path
              d="M 308 294 C 342 280, 366 306, 358 338 C 350 370, 304 386, 276 382 C 260 380, 250 390, 248 402 C 268 402, 284 392, 296 382"
              fill="none" stroke="url(#al_gold)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"
            />
          </G>
        )}
      </G>
    </Svg>
  );
}
