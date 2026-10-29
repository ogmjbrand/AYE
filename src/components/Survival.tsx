import { useEffect, useState } from 'react';
import { Ambulance, BedDouble, Heart, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';
import {
  CRITICAL, MAX_HEALTH, MEDIC_HEAL, MEDICAL_ITEMS, MEDIC_THRESHOLD, bestUsableItem, canBuyMedical, canCallMedic, canUseItem, healthStatus, kitCount, medicalItem, recoveryProgress,
  type Health, type MedicalItem, type RecoveryPlace,
} from '../lib/health';
import { ConfirmRow } from './WorkGear';

const GOLD = 'rounded-xl bg-gradient-to-b from-[#e8b452] via-[#d79d3c] to-[#c88a2c] px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0c67e]';
const DARK = 'rounded-xl border border-ui-gold/40 bg-[#1a1815] px-4 py-2.5 text-sm font-semibold text-ui-ink transition hover:border-ui-gold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold';
const SMALL_GOLD = 'shrink-0 rounded-lg bg-gradient-to-b from-[#e8b452] via-[#d79d3c] to-[#c88a2c] px-3 py-1.5 text-xs font-bold text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0c67e]';
const money = (n: number) => `${Math.round(n).toLocaleString()} GHAI`;
const clock = (totalMinutes: number) => `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')}:${String(Math.floor(totalMinutes % 60)).padStart(2, '0')}`;

function HealthBar({ value, label = 'Health' }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = value <= CRITICAL ? 'from-[#8a1c1f] to-[#e5484d]' : value <= 25 ? 'from-[#b3541e] to-[#f08c3a]' : 'from-[#2f7d32] to-[#4eae42]';
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="font-semibold">{label}</span><span className="tabular-nums text-ui-muted">{Math.round(value)} / {MAX_HEALTH}</span></div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#2a2620]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={MAX_HEALTH} aria-valuenow={Math.round(value)}>
        <div className={`h-full rounded-full bg-gradient-to-r ${tone} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Critical condition (10% or below): a red edge to the screen that pulses
 * like a heartbeat, and a banner with what you can do: use your best item,
 * call a medic, or open your health.
 */
export function CriticalWarning({ health, now, supernatural, onUseItem, onCallMedic, onOpen }: {
  health: Health;
  now: number;
  supernatural: boolean;
  onUseItem: (id: string) => void;
  onCallMedic: () => void;
  onOpen: () => void;
}) {
  const status = healthStatus(health);
  if (status !== 'critical' && status !== 'low') return null;
  const critical = status === 'critical';
  const item = bestUsableItem(health, now, supernatural);
  const medic = canCallMedic(health);
  return (
    <>
      <div aria-hidden="true" className={`pointer-events-none fixed inset-0 z-30 ${critical ? 'survival-vignette-critical' : 'survival-vignette-low'}`} />
      {critical && (
        <div role="alert" className="pointer-events-auto fixed left-1/2 top-16 z-40 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border border-[#e5484d]/70 bg-[#140708]/90 p-3 text-ui-ink shadow-2xl backdrop-blur">
          <p className="m-0 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[#ff8a8d]"><HeartPulse size={18} aria-hidden="true" /> Critical condition · {Math.round(health.value)}%</p>
          <p className="m-0 mt-1 text-xs text-ui-muted">You&rsquo;re protected: you can&rsquo;t die in AYE. If your health reaches 5% you&rsquo;ll be taken for emergency care automatically.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {item && <button type="button" onClick={() => onUseItem(item.id)} className={SMALL_GOLD}>Use {item.name} (+{item.heal})</button>}
            <button type="button" onClick={onCallMedic} disabled={!medic.ok} title={medic.ok ? undefined : medic.reason} className={SMALL_GOLD}>{health.medicAt !== null ? 'Medic on the way' : 'Call a medic'}</button>
            <button type="button" onClick={onOpen} className="shrink-0 rounded-lg border border-ui-gold/40 px-3 py-1.5 text-xs font-semibold hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">Health</button>
          </div>
        </div>
      )}
    </>
  );
}

/** A paramedic is on the way: how long until they reach you. */
export function MedicComing({ health, now }: { health: Health; now: number }) {
  if (health.medicAt === null || health.recovery) return null;
  const left = Math.max(0, Math.ceil(health.medicAt - now));
  return (
    <div role="status" className="pointer-events-none fixed bottom-36 left-1/2 z-30 -translate-x-1/2 rounded-full border border-ui-gold/40 bg-black/75 px-4 py-1.5 text-xs font-semibold text-ui-ink backdrop-blur">
      <Ambulance size={14} aria-hidden="true" className="mr-1.5 inline text-[#ff8a8d]" /> Paramedic on the way · {left} min · free
    </div>
  );
}

/**
 * The moment emergency recovery starts: a short, calm full-screen card so it
 * never looks like a crash or a death, then the game carries on where you're
 * being looked after.
 */
export function EmergencyTransition({ place, reason, onDone }: { place: RecoveryPlace; reason: string; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 3200);
    const done = setTimeout(onDone, 3900);
    return () => { clearTimeout(fade); clearTimeout(done); };
  }, [onDone]);
  const Icon = place === 'sanctuary' ? Sparkles : place === 'field' ? HeartPulse : Ambulance;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="emergency-title"
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 p-6 text-center text-ui-ink transition-opacity duration-700 ${leaving ? 'opacity-0' : 'opacity-100'}`}>
      <div className="survival-heartbeat flex h-20 w-20 items-center justify-center rounded-full border border-[#e5484d]/60 bg-[#e5484d]/10">
        <Heart size={40} aria-hidden="true" className="fill-[#e5484d] text-[#e5484d]" />
      </div>
      <p className="m-0 mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-ui-muted">Emergency recovery</p>
      <h2 id="emergency-title" className="m-0 mt-2 font-display text-2xl font-semibold uppercase tracking-[0.06em] text-ui-gold-strong">You&rsquo;re safe</h2>
      <p className="m-0 mt-3 max-w-sm text-sm">
        <Icon size={16} aria-hidden="true" className="mr-1.5 inline text-ui-gold" />
        {place === 'sanctuary' ? 'Your sanctuary is calling you home to its healing chamber.' : place === 'field' ? 'The field medic is treating you now.' : 'Paramedics are taking you to General Hospital.'}
      </p>
      <p className="m-0 mt-2 max-w-sm text-xs text-ui-muted">You {reason}. Nothing you own or have earned is lost, and the care is free.</p>
    </div>
  );
}

const STAFF: Record<RecoveryPlace, readonly string[]> = {
  hospital: [
    'Nurse Bisi (computer-controlled): “Your observations are improving. Rest now.”',
    'Dr Okafor (computer-controlled): “Nothing broken. You’ll be discharged once you’re back to full strength.”',
    'Nurse Bisi (computer-controlled): “Drink some water, and eat properly when you leave.”',
  ],
  sanctuary: [
    'The chamber’s light steadies as your strength returns.',
    'Your energy gathers like a tide coming in.',
  ],
  field: ['The medic checks your dressing and nods.'],
};

/**
 * A recovery stay: where you are, why, health coming back, when you can carry
 * on, someone to talk to, and the choice to rest through the rest of it.
 */
export function RecoveryPanel({ health, now, onRest }: { health: Health; now: number; onRest: () => void }) {
  const r = health.recovery;
  const [line, setLine] = useState(0);
  if (!r) return null;
  const progress = recoveryProgress(r, now);
  const lines = STAFF[r.place];
  return (
    <section role="dialog" aria-labelledby="recovery-title" className="pointer-events-auto fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-ui-gold/40 bg-[#050505]/95 p-4 text-ui-ink shadow-2xl backdrop-blur sm:bottom-5">
      <p className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted"><ShieldCheck size={15} aria-hidden="true" className="text-[#4eae42]" /> Protected · recovering</p>
      <h2 id="recovery-title" className="m-0 mt-1 font-display text-xl font-semibold text-ui-gold-strong">{r.place === 'hospital' ? 'Admitted to General Hospital' : r.place === 'sanctuary' ? 'In your healing chamber' : 'Field treatment'}</h2>
      <p className="m-0 mt-1 text-xs text-ui-muted">Brought in because you {r.reason}. {r.place === 'hospital' ? 'Examined at A&E and moved to the ward.' : r.place === 'sanctuary' ? 'Your powers, transformations and belongings are all safe.' : ''}</p>
      <div className="mt-3"><HealthBar value={health.value} /></div>
      <p className="m-0 mt-2 text-xs"><span className="text-ui-muted">You can carry on at</span> <span className="font-semibold tabular-nums">{clock(r.until)}</span> <span className="text-ui-muted">· {Math.round(progress * 100)}% through your stay</span></p>
      <button type="button" onClick={() => setLine((l) => (l + 1) % lines.length)} className="mt-3 w-full rounded-xl border border-white/10 bg-[#1a1815] px-3 py-2 text-left text-xs text-ui-muted hover:border-ui-gold/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
        {lines[line]} <span className="text-ui-gold">· {r.place === 'hospital' ? 'Talk to the staff' : 'Reflect'}</span>
      </button>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onRest} className={`${GOLD} flex-1`}><BedDouble size={16} aria-hidden="true" className="mr-1.5 inline" /> Rest until recovered</button>
      </div>
      <p className="m-0 mt-2 text-[11px] text-ui-muted">Treatment is free. You keep your money, home, career, items and achievements.</p>
    </section>
  );
}

/** Medical supplies for sale: price, effect and how many you can carry, with a confirmation. */
export function MedicalShop({ health, balance, supernatural, onBuy }: { health: Health; balance: number; supernatural: boolean; onBuy: (id: string) => void }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <p className="m-0 text-xs text-ui-muted">Healing items are an extra option. You never need them to survive: emergency care is always free.</p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {MEDICAL_ITEMS.filter((i) => !i.supernatural || supernatural).map((item) => {
          const check = canBuyMedical(health, item, balance, supernatural);
          return (
            <li key={item.id} className="rounded-xl border border-ui-gold/25 bg-[#1a1815] p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold">{item.name}</p>
                  <p className="m-0 mt-0.5 text-xs text-ui-muted">{item.description}</p>
                  <p className="m-0 mt-1 text-[11px] text-ui-gold-strong">+{item.heal} health{item.spirit ? ` · +${item.spirit} supernatural energy` : ''} · {item.minutes} min to use · you have {kitCount(health, item.id)} / {item.max}</p>
                </div>
                <button type="button" disabled={!check.ok} title={check.ok ? undefined : check.reason} onClick={() => setConfirming(item.id)} className={SMALL_GOLD}>{money(item.price)}</button>
              </div>
              {!check.ok && <p className="m-0 mt-1 text-[11px] text-ui-warn">{check.reason}</p>}
              {confirming === item.id && check.ok && (
                <ConfirmRow text={`Buy ${item.name} for ${money(item.price)}?`} amount={-item.price} balance={balance} onConfirm={() => { onBuy(item.id); setConfirming(null); }} onCancel={() => setConfirming(null)} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Your medical kit: what you carry and a button to use each. */
export function MedicalKit({ health, now, supernatural, onUse }: { health: Health; now: number; supernatural: boolean; onUse: (id: string) => void }) {
  const items = Object.keys(health.kit).map((id) => medicalItem(id)).filter((i): i is MedicalItem => !!i);
  if (!items.length) return <p className="m-0 text-xs text-ui-muted">Your kit is empty. The pharmacy at General Hospital and the Gadget Hub sell first-aid supplies.</p>;
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {items.map((item) => {
        const check = canUseItem(health, item, now, supernatural);
        return (
          <li key={item.id} className="flex items-center gap-3 rounded-xl border border-ui-gold/25 bg-[#1a1815] p-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-semibold">{item.name} <span className="text-xs font-normal text-ui-muted">× {kitCount(health, item.id)}</span></p>
              <p className="m-0 text-[11px] text-ui-muted">+{item.heal} health{item.spirit ? ` · +${item.spirit} energy` : ''} · {item.minutes} min{check.ok ? '' : ` · ${check.reason}`}</p>
            </div>
            <button type="button" disabled={!check.ok} onClick={() => onUse(item.id)} className={SMALL_GOLD}>Use</button>
          </li>
        );
      })}
    </ul>
  );
}

/** Your health: the meter, what it means, your kit, a medic, and the no-death promise. */
export function HealthPanel({ health, now, supernatural, onUse, onCallMedic, onClose }: {
  health: Health;
  now: number;
  supernatural: boolean;
  onUse: (id: string) => void;
  onCallMedic: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const status = healthStatus(health);
  const medic = canCallMedic(health);
  const rescues = health.rescues.hospital + health.rescues.sanctuary + health.rescues.field;
  const STATUS_TEXT = {
    healthy: 'You’re in good health.',
    hurt: 'You’re hurt. Health comes back slowly while you’re fed and rested.',
    low: 'Your health is low. Eat, rest, use a healing item or call a medic.',
    critical: 'Critical condition. You’re protected from further serious harm.',
    recovering: 'You’re being looked after.',
  } as const;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="health-title" onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-ui-gold/40 bg-[#050505] p-6 text-ui-ink sm:max-w-md sm:rounded-[2rem]">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="health-title" className="m-0 flex items-center gap-2 font-display text-2xl font-semibold uppercase tracking-[0.06em] text-ui-gold-strong"><Heart size={22} aria-hidden="true" className="fill-[#e5484d] text-[#e5484d]" /> Health</h2>
            <p className="m-0 mt-1 text-xs text-ui-muted">{STATUS_TEXT[status]}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">Close</button>
        </header>
        <div className="mt-5 rounded-2xl border border-ui-gold/25 bg-[#1a1815] p-4">
          <HealthBar value={health.value} />
          {health.lastHurt && <p className="m-0 mt-2 text-[11px] text-ui-muted">Last hurt: you {health.lastHurt.reason}.</p>}
        </div>
        <section className="mt-5">
          <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">Medical kit</p>
          <MedicalKit health={health} now={now} supernatural={supernatural} onUse={onUse} />
        </section>
        <section className="mt-5">
          <button type="button" onClick={onCallMedic} disabled={!medic.ok} className={`${DARK} w-full`}>
            <Ambulance size={16} aria-hidden="true" className="mr-1.5 inline text-[#ff8a8d]" /> {health.medicAt !== null ? `Paramedic arriving at ${clock(health.medicAt)}` : `Call a paramedic (free, +${MEDIC_HEAL} health)`}
          </button>
          {!medic.ok && health.medicAt === null && <p className="m-0 mt-1 text-[11px] text-ui-muted">{medic.reason}</p>}
        </section>
        <section className="mt-5 rounded-2xl border border-[#4eae42]/30 bg-[#0c1a0d] p-4 text-xs">
          <p className="m-0 flex items-center gap-2 font-semibold text-[#8fd88a]"><ShieldCheck size={16} aria-hidden="true" /> In AYE, every player survives</p>
          <ul className="m-0 mt-2 list-disc space-y-1 pl-4 text-ui-muted">
            <li>At {CRITICAL}% you&rsquo;re in critical condition: harm is halved and help is offered.</li>
            <li>At 5% emergency recovery starts by itself: hospital, or your sanctuary if you&rsquo;ve unlocked Divine Evolution.</li>
            <li>Care is free, and you never lose money, items, property or progress.</li>
            <li>Medics come out at {MEDIC_THRESHOLD} health or below.</li>
          </ul>
          {rescues > 0 && <p className="m-0 mt-2 text-ui-muted">Emergency recoveries so far: {rescues}. Paramedic visits: {health.medicVisits}.</p>}
        </section>
      </div>
    </div>
  );
}
