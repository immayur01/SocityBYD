import React, { useEffect, useState } from 'react';

// Track session playback on web
let sessionIntroHasPlayed = false;

export function resetIntroSession() {
  sessionIntroHasPlayed = false;
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem('ashtavinayak_intro_played');
    } catch {}
  }
}

interface IntroSplashProps {
  onFinish?: () => void;
  forcePlay?: boolean;
}

export function IntroSplash({ onFinish, forcePlay = false }: IntroSplashProps) {
  const [phase, setPhase] = useState<'drawing' | 'completed' | 'dispersing' | 'fade-out' | 'hidden'>(() => {
    if (!forcePlay) {
      if (sessionIntroHasPlayed) return 'hidden';
      if (typeof sessionStorage !== 'undefined') {
        try {
          if (sessionStorage.getItem('ashtavinayak_intro_played') === 'true') {
            return 'hidden';
          }
        } catch {}
      }
    }
    return 'drawing';
  });

  useEffect(() => {
    if (phase === 'hidden') {
      onFinish?.();
      return;
    }

    sessionIntroHasPlayed = true;
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('ashtavinayak_intro_played', 'true');
      } catch {}
    }

    // 1850ms: logoPulse
    const t1 = setTimeout(() => {
      setPhase('completed');
    }, 1850);

    // 2450ms: scatter dispersion
    const t2 = setTimeout(() => {
      setPhase('dispersing');
    }, 2450);

    // 2850ms: fade-out overlay
    const t3 = setTimeout(() => {
      setPhase('fade-out');
    }, 2850);

    // 3500ms (2850ms + 650ms transition): complete & unmount cleanly
    const t4 = setTimeout(() => {
      setPhase('hidden');
      onFinish?.();
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [forcePlay]);

  if (phase === 'hidden') {
    return null;
  }

  // Combine CSS classes based on active animation phase
  let containerClasses = '';
  if (phase === 'completed') {
    containerClasses = 'completed';
  } else if (phase === 'dispersing') {
    containerClasses = 'completed dispersing';
  } else if (phase === 'fade-out') {
    containerClasses = 'completed dispersing fade-out';
  }

  return (
    <>
      <style>{`
        #intro-splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          background: #070B14;
          transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), visibility 0.65s ease;
        }
        #intro-splash.fade-out {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        .draw-stroke {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawPath 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .pop-fill {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          transform: scale(0.4);
          animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .step-1 { animation-delay: 0.10s; }
        .step-2 { animation-delay: 0.28s; }
        .step-3 { animation-delay: 0.38s; }
        .step-4 { animation-delay: 0.52s; }
        .step-5 { animation-delay: 0.62s; }
        .step-6 { animation-delay: 0.82s; }
        .step-7 { animation-delay: 0.94s; }
        .step-8 { animation-delay: 1.15s; }
        .step-9 { animation-delay: 1.28s; }
        @keyframes drawPath { to { stroke-dashoffset: 0; } }
        @keyframes popIn { to { opacity: 1; transform: scale(1); } }
        #intro-splash.completed .logo-svg { animation: logoPulse 0.55s ease-out; }
        @keyframes logoPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        .part { transition: transform 0.72s cubic-bezier(0.55, 0.055, 0.675, 0.19), opacity 0.55s ease-in; }
        #intro-splash.dispersing .dir-up { transform: translate(0px, -140px) scale(0.9); opacity: 0; }
        #intro-splash.dispersing .dir-up-slight { transform: translate(0px, -95px); opacity: 0; }
        #intro-splash.dispersing .dir-left { transform: translate(-150px, -20px) rotate(-14deg); opacity: 0; }
        #intro-splash.dispersing .dir-right { transform: translate(150px, -20px) rotate(14deg); opacity: 0; }
        #intro-splash.dispersing .dir-down-left { transform: translate(-130px, 120px) rotate(-18deg); opacity: 0; }
        #intro-splash.dispersing .dir-down-right { transform: translate(130px, 120px) rotate(18deg); opacity: 0; }
        #intro-splash.dispersing .dir-down { transform: translate(15px, 150px); opacity: 0; }
      `}</style>

      <div id="intro-splash" className={containerClasses}>
        <svg
          className="logo-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="130 85 252 330"
          width="185"
          height="240"
          style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.45))' }}
        >
          <defs>
            <linearGradient id="goldFloat" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>

          <path
            className="part dir-up draw-stroke step-1"
            pathLength={100}
            d="M 206 168 L 206 136 L 256 98 L 306 136 L 306 168"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="11"
            strokeLinejoin="miter"
          />

          <polygon
            className="part dir-up pop-fill step-2"
            points="256,122 267,131 267,144 245,144 245,131"
            fill="url(#goldFloat)"
          />

          <path
            className="part dir-up-slight draw-stroke step-3"
            pathLength={100}
            d="M 218 176 Q 256 144 294 176"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="11"
            strokeLinecap="round"
          />

          <path
            className="part dir-up-slight pop-fill step-4"
            d="M 256 176 C 256 176, 248 194, 248 201 A 8 8 0 0 0 264 201 C 264 194, 256 176, 256 176 Z"
            fill="#DC2626"
          />

          <path
            className="part dir-left draw-stroke step-5"
            pathLength={100}
            d="M 216 196 C 188 182, 162 180, 146 182 C 154 214, 154 248, 174 264 C 194 278, 212 262, 206 238 L 206 218"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="11"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <path
            className="part dir-right draw-stroke step-5"
            pathLength={100}
            d="M 296 196 C 324 182, 350 180, 366 182 C 358 214, 358 248, 338 264 C 318 278, 300 262, 306 238 L 306 218"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="11"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <path
            className="part dir-left pop-fill step-6"
            d="M 218 218 Q 228 212 236 220 Q 227 226 218 218 Z"
            fill="url(#goldFloat)"
          />
          <path
            className="part dir-right pop-fill step-6"
            d="M 294 218 Q 284 212 276 220 Q 285 226 294 218 Z"
            fill="url(#goldFloat)"
          />

          <path
            className="part dir-down draw-stroke step-7"
            pathLength={100}
            d="M 216 196 C 242 212, 246 244, 246 276 C 246 318, 276 346, 314 334 C 304 354, 268 360, 248 338 C 232 320, 232 288, 232 262"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="part dir-down draw-stroke step-7"
            pathLength={100}
            d="M 296 196 C 270 212, 266 244, 266 274 C 266 298, 282 318, 304 316"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="11"
            strokeLinecap="round"
          />

          <path
            className="part dir-down-left draw-stroke step-8"
            pathLength={100}
            d="M 224 262 L 214 274"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            className="part dir-down-right draw-stroke step-8"
            pathLength={100}
            d="M 288 262 L 298 274"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="9"
            strokeLinecap="round"
          />

          <path
            className="part dir-down-left draw-stroke step-9"
            pathLength={100}
            d="M 204 294 C 170 280, 146 306, 154 338 C 162 370, 204 388, 240 390"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            className="part dir-down-right draw-stroke step-9"
            pathLength={100}
            d="M 308 294 C 342 280, 366 306, 358 338 C 350 370, 304 386, 276 382 C 260 380, 250 390, 248 402 C 268 402, 284 392, 296 382"
            fill="none"
            stroke="url(#goldFloat)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
}
