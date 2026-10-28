import { useEffect } from 'react';
import { Coins, Sparkles, Star } from 'lucide-react';
import { Crown } from './AyeBrand';

/** Gold wings around a ring with the level number, under a crown. */
function LevelEmblem({ level }: { level: number }) {
  const feathers = [0, 1, 2, 3, 4];
  return (
    <div className="relative mx-auto h-44 w-72" aria-hidden="true">
      <svg viewBox="0 0 300 180" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="lvl-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7dc96" />
            <stop offset="0.5" stopColor="#e3ad4c" />
            <stop offset="1" stopColor="#a86f20" />
          </linearGradient>
          <radialGradient id="lvl-glow" cx="0.5" cy="0.55" r="0.5">
            <stop offset="0" stopColor="#f0c67e" stopOpacity="0.45" />
            <stop offset="1" stopColor="#f0c67e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="150" cy="100" rx="150" ry="85" fill="url(#lvl-glow)" />
        {[-1, 1].map((side) => (
          <g key={side} transform={side < 0 ? 'translate(300 0) scale(-1 1)' : undefined}>
            {feathers.map((i) => (
              <path key={i} d={`M196 ${78 + i * 12} Q ${236 + i * 6} ${60 + i * 14} ${282 - i * 10} ${40 + i * 18} Q ${248 - i * 4} ${88 + i * 10} 196 ${98 + i * 12} Z`} fill="url(#lvl-gold)" opacity={1 - i * 0.12} />
            ))}
          </g>
        ))}
        <circle cx="150" cy="100" r="58" fill="#120d06" stroke="url(#lvl-gold)" strokeWidth="9" />
        <circle cx="150" cy="100" r="47" fill="none" stroke="#f0c67e" strokeOpacity="0.35" strokeWidth="2" />
      </svg>
      <div className="absolute left-1/2 top-0 -translate-x-1/2"><Crown className="h-8 w-12" /></div>
      <span className="absolute inset-x-0 top-[3.9rem] text-center font-display text-6xl font-bold leading-none text-[#f0c67e] [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">{level}</span>
    </div>
  );
}

/**
 * Reaching a new player level: the emblem, what it unlocked and Continue.
 * Only real rewards are listed: the level's GHAI, and anything else that
 * came with it (perks, wardrobe items) as the game reported it.
 */
export function LevelUp({ level, reward, unlocked, onContinue }: { level: number; reward: number; unlocked: string[]; onContinue: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onContinue(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={onContinue}>
      <div role="dialog" aria-modal="true" aria-labelledby="levelup-title" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[2rem] border border-ui-gold/40 bg-[#050505] px-6 pb-6 pt-8 text-ui-ink shadow-[0_0_60px_rgba(215,157,60,0.25)]">
        <h2 id="levelup-title" className="m-0 text-center font-display text-3xl font-semibold uppercase tracking-[0.06em] text-ui-gold-strong">Level up!</h2>
        <div className="mt-5"><LevelEmblem level={level} /></div>
        <p className="m-0 mt-5 text-sm font-semibold">Rewards unlocked:</p>
        <ul className="m-0 mt-3 list-none divide-y divide-white/5 p-0 text-sm">
          <li className="flex items-center gap-3 py-2.5"><Coins size={22} className="text-ui-gold" aria-hidden={true} /> +{reward.toLocaleString()} GHAI</li>
          {unlocked.map((u) => <li key={u} className="flex items-center gap-3 py-2.5"><Star size={22} className="text-ui-gold" aria-hidden={true} /> {u}</li>)}
          <li className="flex items-center gap-3 py-2.5"><Sparkles size={22} className="text-ui-gold" aria-hidden={true} /> Level {level} on your profile</li>
        </ul>
        <button type="button" onClick={onContinue} autoFocus className="mt-6 w-full rounded-xl bg-gradient-to-b from-[#e8b452] via-[#d79d3c] to-[#c88a2c] py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-black hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0c67e]">Continue</button>
      </div>
    </div>
  );
}
