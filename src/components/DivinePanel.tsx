import { useEffect } from 'react';
import { Flame, HeartPulse, Home, Moon, Sparkles, UserRound, Compass } from 'lucide-react';
import { Crown } from './AyeBrand';
import { HEALING_MINUTES, TRANSFORM_COST, UNLOCK_BALANCE, canHeal, canTransform, isUnlocked, type Supernatural } from '../lib/supernatural';

const GOLD_BUTTON = 'w-full rounded-xl bg-gradient-to-b from-[#e8b452] via-[#d79d3c] to-[#c88a2c] py-3 text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0c67e]';
const DARK_BUTTON = 'flex w-full items-center gap-3 rounded-xl border border-ui-gold/30 bg-[#1a1815] px-4 py-3 text-left text-sm transition hover:border-ui-gold/70 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold';

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'energy' | 'tired' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="font-semibold">{label}</span><span className="tabular-nums text-ui-muted">{Math.round(value)} / {max}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#2a2620]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
        <div className={`h-full rounded-full ${tone === 'energy' ? 'bg-gradient-to-r from-[#7a4cff] via-[#c08cff] to-[#f0c67e]' : 'bg-gradient-to-r from-[#8a3b2c] to-[#e07a5f]'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Divine Evolution. Locked: the requirement and your balance. Unlocked: your
 * form and energy, transform or return to human form whenever you like, what
 * to do next (go home, rest, carry on), and the healing chamber in your home.
 */
export function DivinePanel({ s, balance, atHome, hasHome, onUnlock, onTransform, onReturnToHuman, onHeal, onGoHome, onRest, onClose }: {
  s: Supernatural;
  balance: number;
  atHome: boolean;
  hasHome: boolean;
  onUnlock: () => void;
  onTransform: () => void;
  onReturnToHuman: () => void;
  onHeal: () => void;
  onGoHome: () => void;
  onRest: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const unlocked = isUnlocked(s);
  const transformed = s.form === 'transformed';
  const tf = canTransform(s);
  const healing = canHeal(s, atHome);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="divine-title" onClick={(e) => e.stopPropagation()}
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] border border-ui-gold/40 bg-[#050505] p-6 text-ui-ink sm:max-w-md sm:rounded-[2rem]">
        <header className="flex items-start justify-between gap-3">
          <div>
            <Crown className="h-6 w-9" />
            <h2 id="divine-title" className="m-0 mt-2 font-display text-2xl font-semibold uppercase tracking-[0.06em] text-ui-gold-strong">Divine Evolution</h2>
            <p className="m-0 mt-1 text-xs text-ui-muted">{unlocked ? (transformed ? 'You are in your supernatural form.' : 'You are in human form.') : 'AYE’s most exclusive way to play.'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">Close</button>
        </header>

        {!unlocked ? (
          <section className="mt-6 space-y-4">
            <div className="rounded-2xl border border-ui-gold/25 bg-[#1a1815] p-4">
              <p className="m-0 text-xs uppercase tracking-[0.16em] text-ui-muted">Unlock requirement</p>
              <p className="m-0 mt-1 text-2xl font-bold tabular-nums text-ui-gold-strong">{UNLOCK_BALANCE.toLocaleString()} GHAI</p>
              <p className="m-0 mt-3 text-xs uppercase tracking-[0.16em] text-ui-muted">Your balance</p>
              <p className="m-0 mt-1 text-lg font-semibold tabular-nums">{Math.round(balance).toLocaleString()} GHAI</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#2a2620]" role="progressbar" aria-label="Towards the unlock" aria-valuemin={0} aria-valuemax={UNLOCK_BALANCE} aria-valuenow={Math.round(balance)}>
                <div className="h-full rounded-full bg-gradient-to-r from-[#c88a2c] to-[#f0c67e]" style={{ width: `${Math.min(100, (balance / UNLOCK_BALANCE) * 100)}%` }} />
              </div>
            </div>
            <button type="button" onClick={onUnlock} disabled={balance < UNLOCK_BALANCE} className={GOLD_BUTTON}>Unlock Divine Evolution</button>
            <p className="m-0 text-[11px] text-ui-muted">Unlocking costs nothing: you only need to hold the balance once, and access stays after you spend. Your balance is checked on this device for now; once AYE&rsquo;s servers are live it will be checked there.</p>
          </section>
        ) : (
          <section className="mt-6 space-y-5">
            <div className="space-y-3 rounded-2xl border border-ui-gold/25 bg-[#1a1815] p-4">
              <Meter label="Supernatural energy" value={s.energy} max={s.maxEnergy} tone="energy" />
              <Meter label="Exhaustion" value={s.exhaustion} max={100} tone="tired" />
            </div>

            {transformed ? (
              <div className="space-y-2">
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">What next?</p>
                <button type="button" onClick={onClose} className={DARK_BUTTON}><Sparkles size={20} className="text-ui-gold" aria-hidden={true} /> Remain transformed</button>
                <button type="button" onClick={onReturnToHuman} className={DARK_BUTTON}><UserRound size={20} className="text-ui-gold" aria-hidden={true} /> Return to human form</button>
                <button type="button" onClick={() => { onReturnToHuman(); onGoHome(); }} disabled={!hasHome} className={DARK_BUTTON}><Home size={20} className="text-ui-gold" aria-hidden={true} /> Return home{hasHome ? '' : ' (you have no home yet)'}</button>
                <button type="button" onClick={() => { onReturnToHuman(); onRest(); }} className={DARK_BUTTON}><Moon size={20} className="text-ui-gold" aria-hidden={true} /> Rest and recover {atHome ? '(sleep in your bed)' : '(sleeping away from home recovers half)'}</button>
                <button type="button" onClick={() => { onReturnToHuman(); onClose(); }} className={DARK_BUTTON}><Compass size={20} className="text-ui-gold" aria-hidden={true} /> Continue exploring</button>
                <p className="m-0 text-[11px] text-ui-muted">Staying transformed uses energy every minute. At zero you return to human form by yourself.</p>
              </div>
            ) : (
              <div>
                <button type="button" onClick={onTransform} disabled={!tf.ok} className={GOLD_BUTTON}><span className="inline-flex items-center gap-2"><Flame size={18} aria-hidden={true} /> Transform ({TRANSFORM_COST} energy)</span></button>
                {!tf.ok && <p className="m-0 mt-2 text-[11px] text-ui-warn">{tf.reason}</p>}
                <p className="m-0 mt-2 text-[11px] text-ui-muted">Your face, body, clothes and hair stay yours in every form. Return to human form any time.</p>
              </div>
            )}

            <div className="rounded-2xl border border-ui-gold/25 bg-[#1a1815] p-4">
              <p className="m-0 flex items-center gap-2 text-sm font-semibold"><HeartPulse size={18} className="text-ui-gold" aria-hidden={true} /> Spiritual Healing Chamber</p>
              <p className="m-0 mt-1 text-xs text-ui-muted">In your home&rsquo;s sanctuary: {HEALING_MINUTES} minutes restores all your energy and clears exhaustion.</p>
              <button type="button" onClick={onHeal} disabled={!healing.ok} className={`${GOLD_BUTTON} mt-3`}>Heal ({HEALING_MINUTES} min)</button>
              {!healing.ok && <p className="m-0 mt-2 text-[11px] text-ui-muted">{healing.reason}</p>}
            </div>
            <p className="m-0 text-[11px] text-ui-muted">Coming in the next stages: powers and their progression trees, paths, the mystical garden, energy crystals, the meditation room, the power altar and the rest of your sanctuary.</p>
          </section>
        )}
      </div>
    </div>
  );
}
