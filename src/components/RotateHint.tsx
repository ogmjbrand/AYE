import { Smartphone } from 'lucide-react';
import { AyeLogo } from './AyeBrand';

/**
 * Shown on touch screens held upright while you play: AYE is played sideways.
 * Pure CSS decides when (App.css .rotate-hint), so it appears the moment the
 * phone turns and needs no permission.
 */
export function RotateHint() {
  return (
    <div className="rotate-hint fixed inset-0 z-[90] flex-col items-center justify-center gap-6 bg-[#050505] p-8 text-center text-ui-ink" role="dialog" aria-modal="true" aria-labelledby="rotate-title">
      <AyeLogo className="w-40" />
      <div className="rotate-hint-phone flex h-16 w-16 items-center justify-center rounded-2xl border border-ui-gold/50">
        <Smartphone size={34} aria-hidden="true" className="text-ui-gold-strong" />
      </div>
      <div>
        <h2 id="rotate-title" className="m-0 font-display text-xl font-semibold uppercase tracking-[0.08em] text-ui-gold-strong">Turn your phone sideways</h2>
        <p className="m-0 mt-2 text-sm text-ui-muted">AYE is played in landscape. Your game carries on as soon as you turn it.</p>
      </div>
    </div>
  );
}
