/**
 * The hospital's departments for everyone, patient or herbalist: modern services (check-up,
 * tests, scans, emergency, theatre, rehabilitation, the recovery room), and the Herbal Medicine
 * Centre (dispensary, preparation room, medicinal garden, treatment room, research bench).
 *
 * Every purchase shows its price and its effect, and waits for you to confirm. The rules live in
 * lib/careState.ts and lib/herbalCareer.ts; the reducer re-checks every one (lib/gameState.ts).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, FlaskConical, Leaf, Sprout, Stethoscope, X } from 'lucide-react';
import type { CareAction, GameState } from '../lib/gameState';
import { formatGameTime } from '../lib/gameState';
import { CRITICAL } from '../lib/health';
import { CARE_SERVICES, conditionById, plansFor, type CarePlanKind, type DepartmentId } from '../lib/healthcare';
import { CARRIED_REMEDIES, HERBAL_DISCLAIMER, PLANTS, REMEDIES, STEP_LABEL, plantById, remedyById, type PrepStep, type RemedyEffect } from '../lib/herbal';
import {
  COURSES, GARDEN_PLOTS, RANKS, RESEARCH, consult, consultPatient, doResearch, identificationQuestion, identify, nextCourse,
  prepare, rankOf, ripe, canPrepare, type ConsultChoice,
} from '../lib/herbalCareer';
import { canBuyRemedy, canHaveService, canTakeRemedy, cabinetCount, servicePrice } from '../lib/careState';
import type { CareDepartmentPoint } from '../lib/hospitalSite';
import { HOSPITAL_POINT_LABEL } from '../lib/hospitalSite';

const buttonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ui-accent bg-ui-accent px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent';
const secondaryClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ui-line px-3 py-2 text-left text-sm font-semibold text-ui-ink transition active:scale-[0.98] hover:border-ui-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent';

/** Which modern services each room offers. */
const ROOM_SERVICES: Partial<Record<CareDepartmentPoint, DepartmentId[]>> = {
  emergency: ['emergency'],
  examination: ['examination'],
  imaging: ['imaging'],
  laboratory: ['laboratory'],
  surgery: ['surgery'],
  rehabilitation: ['rehabilitation', 'recovery'],
};

function effectText(e: RemedyEffect): string {
  const parts: string[] = [];
  if (e.heal) parts.push(`+${e.heal} health`);
  if (e.energy) parts.push(`${e.energy > 0 ? '+' : ''}${e.energy} energy`);
  if (e.fullness) parts.push(`+${e.fullness} fullness`);
  if (e.hygiene) parts.push(`+${e.hygiene} hygiene`);
  if (e.protect) parts.push(`${e.protect} min guarded from harm`);
  return parts.join(' · ') || 'No effect';
}

const PLAN_LABEL: Record<CarePlanKind, string> = { modern: 'Modern medicine', herbal: 'Herbal care', combined: 'Combined care' };

interface Pending { title: string; price: number; effect: string; minutes: number; action: CareAction; done: string }

interface Props {
  point: CareDepartmentPoint;
  state: GameState;
  act: (action: CareAction) => void;
  onClose: () => void;
}

export function HealthcarePanel({ point, state, act, onClose }: Props) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const herbal = point.startsWith('herbal-');
  const recovering = !!state.health.recovery;
  const ask = (p: Pending) => { setMessage(null); setPending(p); };
  const confirm = () => {
    if (!pending) return;
    act(pending.action);
    setMessage(pending.done);
    setPending(null);
  };
  /** Do a herbal step and say how it went (the same pure rule the reducer runs). */
  const step = (action: CareAction, result: { ok: true; message: string } | { ok: false; reason: string }) => {
    if (result.ok) act(action);
    setMessage(result.ok ? result.message : result.reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-3 sm:items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="care-panel-title"
        className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-xl border border-ui-line bg-ui-panel p-5 text-ui-ink shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
              {herbal ? 'Herbal Medicine Centre' : 'General Hospital'} · {formatGameTime(state.time)}
            </p>
            <h2 id="care-panel-title" className="m-0 mt-1 font-display text-2xl font-bold">{HOSPITAL_POINT_LABEL[point].replace(/^The /, '').replace(/^./, (c) => c.toUpperCase())}</h2>
            <p className="m-0 mt-1 text-sm text-ui-muted">Health {Math.round(state.health.value)} · {Math.floor(state.balance).toLocaleString()} GHAI</p>
          </div>
          <button type="button" aria-label="Close" className="rounded-lg p-2 text-ui-muted hover:text-ui-ink" onClick={onClose}><X size={20} /></button>
        </header>

        {recovering && <Note tone="warn">You are on an emergency stay: the ward is looking after you. Services and remedies wait until you are discharged.</Note>}
        {herbal && <CareerHeader state={state} act={act} setMessage={setMessage} />}
        {message && <Note>{message}</Note>}

        {pending ? (
          <ConfirmBox pending={pending} balance={state.balance} onConfirm={confirm} onCancel={() => setPending(null)} />
        ) : (
          <>
            {ROOM_SERVICES[point] && <ModernRoom point={point} state={state} ask={ask} act={act} />}
            {point === 'herbal-dispensary' && <Dispensary state={state} ask={ask} act={act} setMessage={setMessage} />}
            {point === 'herbal-preparation' && <Preparation state={state} step={step} />}
            {point === 'herbal-garden' && <Garden state={state} step={step} />}
            {point === 'herbal-treatment' && <Treatment state={state} ask={ask} step={step} />}
            {point === 'herbal-research' && <Research state={state} step={step} />}
          </>
        )}
        {herbal && <p className="m-0 mt-5 text-xs leading-5 text-ui-muted">{HERBAL_DISCLAIMER}</p>}
      </section>
    </div>
  );
}

function Note({ children, tone }: { children: ReactNode; tone?: 'warn' }) {
  return <p className={`m-0 mb-4 rounded-lg border p-3 text-sm ${tone === 'warn' ? 'border-amber-500/60 text-amber-200' : 'border-ui-line text-ui-ink'}`}>{children}</p>;
}

function Section({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="m-0 mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ui-muted">{icon}{title}</h3>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function Row({ title, detail, right }: { title: string; detail: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ui-line p-3">
      <div className="min-w-0">
        <p className="m-0 font-semibold">{title}</p>
        <div className="m-0 mt-0.5 text-xs leading-5 text-ui-muted">{detail}</div>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

function ConfirmBox({ pending, balance, onConfirm, onCancel }: { pending: Pending; balance: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="rounded-lg border border-ui-accent p-4">
      <p className="m-0 text-xs uppercase tracking-[0.12em] text-ui-muted">Confirm</p>
      <p className="m-0 mt-1 text-lg font-bold">{pending.title}</p>
      <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-ui-muted">Price</dt><dd className="m-0 font-semibold">{pending.price === 0 ? 'Free' : `${pending.price} GHAI`}</dd>
        <dt className="text-ui-muted">Effect</dt><dd className="m-0">{pending.effect}</dd>
        <dt className="text-ui-muted">Time</dt><dd className="m-0">{pending.minutes} min</dd>
        <dt className="text-ui-muted">After</dt><dd className="m-0">{Math.floor(balance - pending.price).toLocaleString()} GHAI</dd>
      </dl>
      <div className="mt-4 flex gap-2">
        <button type="button" className={buttonClass} onClick={onConfirm}><Check size={16} />Confirm</button>
        <button type="button" className={secondaryClass} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ——— Modern rooms ———————————————————————————————————————————————————————

function ModernRoom({ point, state, ask, act }: { point: CareDepartmentPoint; state: GameState; ask: (p: Pending) => void; act: (a: CareAction) => void }) {
  const services = CARE_SERVICES.filter((s) => ROOM_SERVICES[point]!.includes(s.department));
  const health = state.health.value;
  const d = state.care.diagnosis;
  const condition = conditionById(d?.condition);
  return (
    <>
      {point === 'emergency' && health <= CRITICAL && <Note tone="warn">Your health is critical: emergency treatment is free.</Note>}
      <Section title="Services" icon={<Stethoscope size={14} />}>
        {services.map((s) => {
          const price = servicePrice(s.id, health);
          const check = canHaveService(s.id, state.balance, health, !!state.health.recovery);
          return (
            <Row key={s.id} title={s.name}
              detail={<>{s.description}<br />{effectText(s.effect)} · {s.minutes} min{s.diagnoses ? ' · gives a diagnosis' : ''}</>}
              right={<button type="button" className={buttonClass} disabled={!check.ok} title={check.ok ? undefined : check.reason}
                onClick={() => ask({ title: s.name, price, effect: effectText(s.effect), minutes: s.minutes, action: { type: 'careService', serviceId: s.id }, done: `${s.name}: done.${s.diagnoses ? ' Your diagnosis and care plan are below.' : ''}` })}>
                {price === 0 ? 'Free' : `${price} GHAI`}</button>} />
          );
        })}
      </Section>
      {condition && (
        <Section title="Your diagnosis">
          <div className="rounded-lg border border-ui-line p-3 text-sm">
            <p className="m-0 font-semibold">{condition.name}</p>
            <p className="m-0 mt-1 text-ui-muted">{condition.signs}</p>
            {condition.emergency && <p className="m-0 mt-2 font-semibold text-amber-200">Red flag: emergency care in the emergency bay. Herbal care is never a substitute here.</p>}
            <p className="m-0 mt-2">Recommended: <b>{PLAN_LABEL[condition.plan]}</b>
              {condition.services.length > 0 && <> · {condition.services.map((id) => CARE_SERVICES.find((s) => s.id === id)?.name).join(', ')}</>}
              {condition.remedies.length > 0 && <> · {condition.remedies.map((id) => remedyById(id)?.name).join(', ')}</>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {plansFor(condition).map((plan) => (
                <button key={plan} type="button" className={d?.plan === plan ? buttonClass : secondaryClass} onClick={() => act({ type: 'careChoosePlan', plan })}>{PLAN_LABEL[plan]}</button>
              ))}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

// ——— The Herbal Medicine Centre ———————————————————————————————————————————

function CareerHeader({ state, act, setMessage }: { state: GameState; act: (a: CareAction) => void; setMessage: (m: string) => void }) {
  const h = state.care.herbal;
  const rank = rankOf(h);
  const next = RANKS[rank + 1];
  const course = nextCourse(h);
  return (
    <div className="mb-4 rounded-lg border border-ui-line p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0"><b>{RANKS[rank].name}</b> <span className="text-ui-muted">· {h.xp} experience</span></p>
        {next && <p className="m-0 text-xs text-ui-muted">Next: {next.name} at {next.xp}</p>}
      </div>
      {next && <div className="mt-2 h-1.5 overflow-hidden rounded bg-ui-line"><div className="h-full bg-ui-accent" style={{ width: `${Math.min(100, (h.xp / next.xp) * 100)}%` }} /></div>}
      {course && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="m-0 text-xs text-ui-muted">Training: <b className="text-ui-ink">{course.name}</b> · {course.note} · {course.minutes} min</p>
          <button type="button" className={secondaryClass} disabled={h.xp < (next?.xp ?? Infinity) || state.balance < course.fee}
            title={h.xp < (next?.xp ?? 0) ? `Needs ${next?.xp} experience` : undefined}
            onClick={() => { act({ type: 'herbalTrain', courseId: course.id }); setMessage(`Passed: ${course.name}. You are now ${next?.name}.`); }}>
            Train · {course.fee} GHAI</button>
        </div>
      )}
      {rank === 4 && h.trained.includes(COURSES[4].id) && h.research.length < 3 && <p className="m-0 mt-2 text-xs text-ui-muted">Master needs 3 finished research projects ({h.research.length} so far).</p>}
    </div>
  );
}

function Dispensary({ state, ask, act, setMessage }: { state: GameState; ask: (p: Pending) => void; act: (a: CareAction) => void; setMessage: (m: string) => void }) {
  const h = state.care.herbal;
  const recovering = !!state.health.recovery;
  const stock = Object.entries(h.stock).filter(([, n]) => n > 0);
  const cabinet = Object.entries(state.care.cabinet).filter(([, n]) => n > 0);
  return (
    <>
      <Section title="On the shelves" icon={<Leaf size={14} />}>
        {CARRIED_REMEDIES.map((r) => {
          const check = canBuyRemedy(state.care, r.id, state.balance, h.research);
          return (
            <Row key={r.id} title={r.name}
              detail={<>{r.forWhat}<br />{effectText(r.effect)} · carry {cabinetCount(state.care, r.id)}/{r.max}{!check.ok ? ` · ${check.reason}` : ''}</>}
              right={<button type="button" className={buttonClass} disabled={!check.ok}
                onClick={() => ask({ title: r.name, price: r.price, effect: effectText(r.effect), minutes: 0, action: { type: 'careBuyRemedy', remedyId: r.id }, done: `${r.name} is in your medicine cabinet.` })}>{r.price} GHAI</button>} />
          );
        })}
      </Section>
      <Section title="Your medicine cabinet">
        {cabinet.length === 0 && <p className="m-0 text-sm text-ui-muted">Empty. Remedies you buy are kept here and saved with your game.</p>}
        {cabinet.map(([id, n]) => {
          const r = remedyById(id)!;
          const check = canTakeRemedy(state.care, id, recovering);
          return <Row key={id} title={`${r.name} × ${n}`} detail={effectText(r.effect)}
            right={<button type="button" className={secondaryClass} disabled={!check.ok} onClick={() => { act({ type: 'careTakeRemedy', remedyId: id }); setMessage(`You take the ${r.name.toLowerCase()}: ${effectText(r.effect)}.`); }}>Take</button>} />;
        })}
      </Section>
      {rankOf(h) >= 3 && (
        <Section title="Serve from your own stock">
          {stock.length === 0 && <p className="m-0 text-sm text-ui-muted">Prepare remedies in the preparation room to sell them here.</p>}
          {stock.map(([id, n]) => {
            const r = remedyById(id)!;
            return <Row key={id} title={`${r.name} × ${n}`} detail={`${r.price} GHAI each · your share ${rankOf(h) >= 5 ? '85' : '60'}%`}
              right={<button type="button" className={secondaryClass} onClick={() => { act({ type: 'herbalSell', remedyId: id }); setMessage(`Sold ${r.name}.`); }}>Serve</button>} />;
          })}
        </Section>
      )}
    </>
  );
}

/** A short, steady shuffle of a remedy's steps, so the order has to be known. */
function shuffled(steps: readonly PrepStep[], seed: number): PrepStep[] {
  return steps.map((s, i) => ({ s, k: (i * 37 + seed * 11 + 7) % 53 })).sort((a, b) => a.k - b.k).map((o) => o.s);
}

const TOOL: Record<PrepStep, string> = {
  wash: 'Basin', peel: 'Paring knife', slice: 'Board and knife', pound: 'Mortar and pestle', squeeze: 'Muslin cloth', boil: 'Copper pot',
  steep: 'Lid and timer', strain: 'Strainer', cool: 'Cooling rack', mix: 'Wooden spoon', scoop: 'Spoon', serve: 'Bottle and label',
};

function Preparation({ state, step }: { state: GameState; step: (a: CareAction, r: { ok: true; message: string } | { ok: false; reason: string }) => void }) {
  const h = state.care.herbal;
  const [remedyId, setRemedyId] = useState<string | null>(null);
  const [order, setOrder] = useState<PrepStep[]>([]);
  const r = remedyId ? remedyById(remedyId) : null;
  const tools = useMemo(() => (r ? shuffled(r.steps, h.prepared + r.id.length) : []), [r, h.prepared]);
  if (!r) {
    return (
      <Section title="Choose a preparation" icon={<FlaskConical size={14} />}>
        <p className="m-0 text-sm text-ui-muted">Ingredients come from the medicinal garden. You have: {Object.entries(h.ingredients).filter(([, n]) => n > 0).map(([id, n]) => `${plantById(id)?.name} ${n}`).join(', ') || 'nothing yet'}.</p>
        {REMEDIES.map((rem) => {
          const check = canPrepare(h, rem.id);
          return <Row key={rem.id} title={rem.name}
            detail={<>Needs {Object.entries(rem.ingredients).map(([id, n]) => `${n} ${plantById(id)?.name}`).join(', ')} · {RANKS[rem.prepareRank].name}{!check.ok ? ` · ${check.reason}` : ''}</>}
            right={<button type="button" className={secondaryClass} disabled={!check.ok} onClick={() => { setRemedyId(rem.id); setOrder([]); }}>Prepare</button>} />;
        })}
      </Section>
    );
  }
  const left = tools.filter((t, i) => order.filter((o) => o === t).length < tools.slice(0, i + 1).filter((x) => x === t).length);
  return (
    <Section title={`Preparing: ${r.name}`} icon={<FlaskConical size={14} />}>
      <p className="m-0 text-sm text-ui-muted">Pick up each tool in the right order. Out of order, the batch spoils.</p>
      <ol className="m-0 grid gap-1 rounded-lg border border-ui-line p-3 pl-8 text-sm">
        {order.length === 0 && <li className="list-none text-ui-muted">The tray is laid out: nothing done yet.</li>}
        {order.map((s, i) => <li key={i}>{STEP_LABEL[s]} <span className="text-ui-muted">({TOOL[s]})</span></li>)}
      </ol>
      <div className="flex flex-wrap gap-2">
        {left.map((s, i) => <button key={`${s}-${i}`} type="button" className={secondaryClass} onClick={() => setOrder([...order, s])}>{TOOL[s]}</button>)}
      </div>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} disabled={order.length !== r.steps.length}
          onClick={() => { step({ type: 'herbalPrepare', remedyId: r.id, order }, prepare(h, r.id, order)); setRemedyId(null); }}>Finish · 20 min</button>
        <button type="button" className={secondaryClass} disabled={order.length === 0} onClick={() => setOrder(order.slice(0, -1))}>Undo</button>
        <button type="button" className={secondaryClass} onClick={() => setRemedyId(null)}>Back</button>
      </div>
    </Section>
  );
}

function Garden({ state, step }: { state: GameState; step: (a: CareAction, r: { ok: true; message: string } | { ok: false; reason: string }) => void }) {
  const h = state.care.herbal;
  const now = state.time.totalMinutes;
  const [choice, setChoice] = useState(PLANTS[0].id);
  const [guide, setGuide] = useState<string | null>(null);
  const seed = Math.floor(now / 2) + Object.values(h.identified).reduce((a, b) => a + b, 0);
  const question = identificationQuestion(seed);
  const rank = rankOf(h);
  return (
    <>
      <Section title="Raised beds" icon={<Sprout size={14} />}>
        <label className="flex items-center gap-2 text-sm">Plant
          <select className="min-h-11 flex-1 rounded-lg border border-ui-line bg-ui-panel px-2 text-ui-ink" value={choice} onChange={(e) => setChoice(e.target.value)}>
            {PLANTS.map((p) => <option key={p.id} value={p.id}>{p.name} · ready in {Math.round(p.growMinutes / 60)} h</option>)}
          </select>
        </label>
        {Array.from({ length: GARDEN_PLOTS }, (_, plot) => {
          const bed = h.garden[plot];
          const p = bed ? plantById(bed.plant) : null;
          const ready = ripe(bed, now);
          const mins = bed && p ? Math.max(0, p.growMinutes - (now - bed.plantedAt)) : 0;
          return <Row key={plot} title={`Bed ${plot + 1}: ${p ? p.name : 'empty'}`}
            detail={p ? (ready ? 'Ready to harvest' : `Growing: ${Math.ceil(mins / 60)} h to go`) : 'Freshly turned soil'}
            right={p
              ? <button type="button" className={secondaryClass} disabled={!ready || rank < 1} title={rank < 1 ? 'Harvesting starts at Apprentice' : undefined}
                  onClick={() => step({ type: 'herbalHarvest', plot }, harvestPreview(state, plot))}>Harvest</button>
              : <button type="button" className={secondaryClass} onClick={() => step({ type: 'herbalPlant', plot, plantId: choice }, { ok: true, message: `Planted ${plantById(choice)!.name}.` })}>Plant</button>} />;
        })}
        {rank < 1 && <p className="m-0 text-xs text-ui-muted">Harvesting starts at Apprentice: learn the plants below to earn the experience.</p>}
      </Section>
      <Section title="Identify the plant">
        <p className="m-0 text-sm">{question.clue}</p>
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((o) => (
            <button key={o.id} type="button" className={secondaryClass}
              onClick={() => step({ type: 'herbalIdentify', plantId: question.plantId, answerId: o.id }, identify(h, question.plantId, o.id))}>{o.name}</button>
          ))}
        </div>
      </Section>
      <Section title="Plant guide">
        <div className="flex flex-wrap gap-2">
          {PLANTS.map((p) => <button key={p.id} type="button" className={guide === p.id ? buttonClass : secondaryClass} onClick={() => setGuide(guide === p.id ? null : p.id)}>{p.name}{h.identified[p.id] ? ' ✓' : ''}</button>)}
        </div>
        {guide && (() => {
          const p = plantById(guide)!;
          return (
            <div className="rounded-lg border border-ui-line p-3 text-sm">
              <p className="m-0 font-semibold">{p.name} <i className="font-normal text-ui-muted">{p.botanical}</i></p>
              <p className="m-0 mt-1 text-ui-muted">{p.localNames.join(' · ')} · {p.part} used</p>
              <p className="m-0 mt-2"><b>Traditionally:</b> {p.traditional}</p>
              <p className="m-0 mt-1"><b>In AYE:</b> {p.game}</p>
            </div>
          );
        })()}
      </Section>
    </>
  );
}

function harvestPreview(state: GameState, plot: number): { ok: true; message: string } | { ok: false; reason: string } {
  const bed = state.care.herbal.garden[plot];
  const p = bed ? plantById(bed.plant) : null;
  if (!p) return { ok: false, reason: 'Nothing is growing there.' };
  const bonus = state.care.herbal.research.includes('res-plant-survey') ? 1 : 0;
  return { ok: true, message: `Harvested ${p.yield + bonus} handfuls of ${p.name}.` };
}

function Treatment({ state, ask, step }: { state: GameState; ask: (p: Pending) => void; step: (a: CareAction, r: { ok: true; message: string } | { ok: false; reason: string }) => void }) {
  const h = state.care.herbal;
  const treatments = REMEDIES.filter((r) => r.service);
  const [choice, setChoice] = useState<ConsultChoice>('refer');
  const patient = consultPatient(Math.floor(state.time.totalMinutes / 20) + h.consults);
  const choices: { label: string; choice: ConsultChoice }[] = [
    { label: 'Send to the doctors now', choice: 'refer' },
    ...CARRIED_REMEDIES.slice(0, 6).flatMap((r) => [
      { label: `Herbal: ${r.name}`, choice: `herbal:${r.id}` as ConsultChoice },
      { label: `With a doctor: ${r.name}`, choice: `combined:${r.id}` as ConsultChoice },
    ]),
  ];
  return (
    <>
      <Section title="Treatments" icon={<Leaf size={14} />}>
        {treatments.map((r) => (
          <Row key={r.id} title={r.name} detail={<>{r.forWhat}<br />{effectText(r.effect)} · {r.minutes} min</>}
            right={<button type="button" className={buttonClass} disabled={state.balance < r.price || !!state.health.recovery}
              onClick={() => ask({ title: r.name, price: r.price, effect: effectText(r.effect), minutes: r.minutes, action: { type: 'careHerbalTreatment', remedyId: r.id }, done: `${r.name}: ${effectText(r.effect)}.` })}>{r.price} GHAI</button>} />
        ))}
      </Section>
      <Section title="Consultation table">
        {rankOf(h) < 2 ? <p className="m-0 text-sm text-ui-muted">Consultations start at Herbal Practitioner.</p> : (
          <div className="rounded-lg border border-ui-line p-3 text-sm">
            <p className="m-0 font-semibold">A patient sits down: “{patient.signs}”</p>
            <p className="m-0 mt-1 text-xs text-ui-muted">Choose the care that fits. Some patients must see a doctor straight away.</p>
            <select aria-label="Your advice" className="mt-3 min-h-11 w-full rounded-lg border border-ui-line bg-ui-panel px-2 text-ui-ink" value={choice} onChange={(e) => setChoice(e.target.value as ConsultChoice)}>
              {choices.map((c) => <option key={c.choice} value={c.choice}>{c.label}</option>)}
            </select>
            <button type="button" className={`${buttonClass} mt-2`} onClick={() => step({ type: 'herbalConsult', conditionId: patient.id, choice }, consult(h, patient.id, choice))}>Advise · 20 min</button>
          </div>
        )}
      </Section>
    </>
  );
}

function Research({ state, step }: { state: GameState; step: (a: CareAction, r: { ok: true; message: string } | { ok: false; reason: string }) => void }) {
  const h = state.care.herbal;
  const [open, setOpen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  return (
    <Section title="Research projects" icon={<FlaskConical size={14} />}>
      {RESEARCH.map((p) => {
        const done = h.research.includes(p.id);
        const blocked = done ? 'Finished' : rankOf(h) < p.rank ? `Needs ${RANKS[p.rank].name}` : p.needs(h);
        return (
          <div key={p.id} className="rounded-lg border border-ui-line p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="m-0 font-semibold">{p.name}{done ? ' ✓' : ''}</p>
                <p className="m-0 mt-0.5 text-xs text-ui-muted">{p.reward}{blocked && !done ? ` · ${blocked}` : ''}</p>
              </div>
              {!done && <button type="button" className={secondaryClass} disabled={!!blocked} onClick={() => { setOpen(open === p.id ? null : p.id); setAnswers([]); }}>{open === p.id ? 'Close' : 'Study'}</button>}
            </div>
            {open === p.id && (
              <div className="mt-3 grid gap-3">
                {p.questions.map((qq, i) => (
                  <fieldset key={i} className="m-0 border-0 p-0">
                    <legend className="mb-1 font-semibold">{qq.q}</legend>
                    <div className="flex flex-wrap gap-2">
                      {qq.options.map((o, k) => <button key={k} type="button" className={answers[i] === k ? buttonClass : secondaryClass}
                        onClick={() => { const next = [...answers]; next[i] = k; setAnswers(next); }}>{o}</button>)}
                    </div>
                  </fieldset>
                ))}
                <button type="button" className={buttonClass} disabled={p.questions.some((_, i) => answers[i] === undefined)}
                  onClick={() => { step({ type: 'herbalResearch', projectId: p.id, answers }, doResearch(h, p.id, answers)); setOpen(null); }}>Write up · 30 min</button>
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );
}
