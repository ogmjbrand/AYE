import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { formatGameTime, type GameTime } from '../lib/gameState';

export interface PhoneApp {
  label: string;
  detail: string;
  icon: LucideIcon;
  onOpen?: () => void;
}

export function PhonePanel({
  characterName,
  balance,
  gameTime,
  apps,
  onClose,
}: {
  characterName: string;
  balance: number;
  gameTime: GameTime;
  apps: readonly PhoneApp[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 sm:justify-end sm:p-8">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-title"
        className="w-full max-w-[21rem] rounded-[2.7rem] border border-white/20 bg-[#08090b] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="relative overflow-hidden rounded-[2.15rem] border border-white/10 bg-[#101216] text-white">
          <div className="flex items-center justify-between px-5 pb-2 pt-3 font-mono text-[11px] tabular-nums text-white/75">
            <span>{formatGameTime(gameTime)}</span>
            <span aria-label="Phone signal and battery">● ▰</span>
          </div>
          <div className="px-5 pb-5 pt-3">
            <header className="mb-6 flex items-start justify-between">
              <div>
                <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d4b36d]">AYE mobile</p>
                <h2 id="phone-title" className="m-0 mt-1 font-display text-xl font-semibold tracking-tight">
                  {characterName}
                </h2>
                <p className="m-0 mt-1 text-xs tabular-nums text-white/60">GHAI {balance.toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close phone"
                className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b36d]"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </header>

            <nav aria-label="Phone apps" className="grid grid-cols-3 gap-x-3 gap-y-5">
              {apps.map(({ label, detail, icon: Icon, onOpen }) => (
                <button
                  key={label}
                  type="button"
                  disabled={!onOpen}
                  onClick={() => {
                    onOpen?.();
                    if (onOpen) onClose();
                  }}
                  title={detail}
                  className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 text-center transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b36d]"
                >
                  <span className="flex size-14 items-center justify-center rounded-[1.1rem] border border-white/10 bg-gradient-to-br from-[#35383c] to-[#1c1e22] text-[#ead29a] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition group-enabled:group-hover:border-[#d4b36d]/60 group-enabled:group-hover:from-[#4a4437]">
                    <Icon size={23} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium text-white/90">{label}</span>
                  <span className="sr-only">{detail}</span>
                </button>
              ))}
            </nav>

            <p className="m-0 mt-6 border-t border-white/10 pt-3 text-center text-[10px] leading-relaxed text-white/45">
              Your life saves as you play. Phone apps open the places and tools available in AYE.
            </p>
          </div>
          <div className="mx-auto mb-2 h-1 w-20 rounded-full bg-white/35" aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}
