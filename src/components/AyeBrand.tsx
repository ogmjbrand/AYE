/**
 * The AYE wordmark (a gold crown over AYE in Cinzel) and the splash scene: a
 * sunset over mountains and a lit city, seen by someone sitting on a cliff.
 * Drawn as SVG so it is sharp on every screen and needs no image download.
 */

const GOLD_TEXT = 'bg-gradient-to-b from-[#f7dc96] via-[#e3ad4c] to-[#b47c26] bg-clip-text text-transparent';

export function Crown({ className = 'h-8 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="aye-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7dc96" />
          <stop offset="0.55" stopColor="#e3ad4c" />
          <stop offset="1" stopColor="#b47c26" />
        </linearGradient>
      </defs>
      <path d="M6 34 L3 10 L17 21 L30 4 L43 21 L57 10 L54 34 Z" fill="url(#aye-crown)" />
      <rect x="6" y="35.5" width="48" height="3.5" rx="1.2" fill="url(#aye-crown)" />
      {[3, 30, 57].map((x, i) => <circle key={x} cx={x} cy={i === 1 ? 4 : 10} r="3" fill="#f7dc96" />)}
    </svg>
  );
}

/** Crown over AYE. `size` sets the wordmark's text size class. */
export function AyeWordmark({ size = 'text-7xl sm:text-8xl', crown = 'h-10 w-16 sm:h-12 sm:w-20' }: { size?: string; crown?: string }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <Crown className={crown} />
      <span className={`mt-1 font-display font-semibold tracking-[0.06em] ${size} ${GOLD_TEXT} drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]`}>AYE</span>
    </div>
  );
}

/** Sunset, mountains, a glowing city in the valley and a figure on the cliff edge. Fills its parent. */
export function SplashScene() {
  // City lights: fixed positions so the picture is the same every time
  const lights = Array.from({ length: 140 }, (_, i) => {
    const x = (i * 97.3) % 1000;
    const y = 640 + ((i * 53.7) % 150) + Math.sin(i) * 10;
    const r = 1 + ((i * 7) % 3) * 0.6;
    return { x, y, r, o: 0.55 + ((i * 13) % 45) / 100 };
  });
  return (
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="aye-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1830" />
          <stop offset="0.28" stopColor="#4a2f4a" />
          <stop offset="0.48" stopColor="#a5574a" />
          <stop offset="0.6" stopColor="#e88c45" />
          <stop offset="0.68" stopColor="#f6b45e" />
          <stop offset="0.75" stopColor="#c56a3a" />
        </linearGradient>
        <radialGradient id="aye-sun" cx="0.62" cy="0.6" r="0.35">
          <stop offset="0" stopColor="#ffe3a3" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="#ffbe6a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9a4a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="aye-valley" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a1e1c" />
          <stop offset="1" stopColor="#120a0a" />
        </linearGradient>
        <linearGradient id="aye-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#050505" stopOpacity="0" />
          <stop offset="1" stopColor="#050505" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="1000" height="1000" fill="url(#aye-sky)" />
      <rect width="1000" height="1000" fill="url(#aye-sun)" />
      {/* Far ranges, lit from behind */}
      <path d="M0 585 L40 560 L75 572 L120 520 L150 540 L190 498 L230 530 L270 505 L300 470 L335 510 L370 488 L410 530 L450 500 L480 520 L520 476 L560 515 L600 490 L640 528 L690 482 L730 520 L770 470 L810 508 L850 486 L900 530 L950 498 L1000 520 L1000 650 L0 650 Z" fill="#7d4146" opacity="0.7" />
      <path d="M0 615 L60 590 L110 600 L160 565 L215 598 L260 575 L310 610 L370 568 L420 600 L470 580 L520 612 L580 572 L640 606 L700 582 L760 615 L820 578 L880 606 L940 585 L1000 600 L1000 690 L0 690 Z" fill="#4a2430" />
      {/* The valley and its city */}
      <path d="M0 640 Q500 610 1000 640 L1000 1000 L0 1000 Z" fill="url(#aye-valley)" />
      {lights.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r={l.r} fill="#ffc96b" opacity={l.o} />)}
      <path d="M0 655 Q500 620 1000 655" stroke="#ffb45a" strokeOpacity="0.25" strokeWidth="18" fill="none" />
      {/* Foreground cliff, and someone sitting on its edge looking out over the city */}
      <path d="M220 1000 L240 860 L300 812 L380 790 L470 784 L540 800 L585 840 L600 1000 Z" fill="#0b0707" />
      <g fill="#0b0707">
        <ellipse cx="455" cy="668" rx="22" ry="26" />
        <path d="M418 694 Q455 680 492 694 L503 790 L410 792 Z" />
        <path d="M470 772 L560 766 L570 794 L466 800 Z" />
        <path d="M545 770 L566 768 L590 840 L568 844 Z" />
        <rect x="372" y="708" width="40" height="58" rx="12" />
      </g>
      <rect width="1000" height="1000" fill="url(#aye-fade)" />
    </svg>
  );
}
