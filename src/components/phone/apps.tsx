import { useEffect, useState, type ReactNode } from 'react';
import type { Destination } from '../../lib/cityDirectory';
import { HOURLY_WAGE, PHONE_CONTACT, WORK_END_HOUR, WORK_START_HOUR, currentMood, hungerLabel, isWorkingHours, rideFare, rideMinutes, type GameState } from '../../lib/gameState';
import { eventToday, suggestions } from '../../lib/life';
import { SKILLS, skillLevel, skillProgress } from '../../lib/lifeState';
import { NEED_KEYS, NEED_LABEL, moodLabel } from '../../lib/needs';
import { FRIENDSHIP_LEVELS, friendshipLevel, gameDay, residentById, type Resident } from '../../lib/people';
import { careerLevel, hoursToNextLevel } from '../../lib/progression';
import { equipmentPay } from '../../lib/equipment';
import { CARS, carById, carResale } from '../../lib/cars';
import { BAND_LABEL, allHomes, forSale, homeById, homesForSale, moveInFee } from '../../lib/homes';
import { CLOSE_HOUR, LEVELS, OPEN_HOUR, SERVICES, SHIFT_END, SHIFT_START, isOpen as spaOpen, levelOf, rollSpaDay } from '../../lib/spa';
import { districtById } from '../../lib/geography';
import {
  APPS, DEFAULT_DOCK, MAX_PHOTOS, MAX_THREAD, TEXTS, WALLPAPERS, appById, replyFrom,
  type AppId, type PhoneMessage,
} from '../../lib/phone';
import { takePhoto } from './camera';
import { shutter } from './sound';
import { Glyph } from './glyphs';
import { WALLPAPER_CSS, ghai, type AppCtx } from './ui';

// ---------------------------------------------------------------- small parts

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n)).toLocaleString()}`;
const clock = (t: number) => `${String(Math.floor((t % 1440) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
function dayLabel(t: number, now: number) {
  const d = gameDay(now) - gameDay(t);
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
}

function Section({ title, children, aside }: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mb-3">
      {title && (
        <div className="mb-1.5 flex items-baseline justify-between px-1">
          <h3 className="m-0 text-[11px] font-semibold uppercase tracking-wider text-white/55">{title}</h3>
          {aside}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl bg-white/[0.06]">{children}</div>
    </section>
  );
}

function Row({ title, sub, right, onClick, disabled }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; disabled?: boolean }) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-white">{title}</div>
        {sub && <div className="mt-0.5 text-[11px] leading-snug text-white/60">{sub}</div>}
      </div>
      {right && <div className="shrink-0 text-right text-[12px] text-white/80">{right}</div>}
    </>
  );
  const cls = 'flex w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 text-left last:border-b-0';
  return onClick
    ? <button type="button" onClick={onClick} disabled={disabled} className={`${cls} transition hover:bg-white/[0.05] disabled:opacity-50`}>{body}</button>
    : <div className={cls}>{body}</div>;
}

function Btn({ children, onClick, tone = 'accent', disabled, small }: { children: ReactNode; onClick: () => void; tone?: 'accent' | 'gold' | 'ghost' | 'danger'; disabled?: boolean; small?: boolean }) {
  const colors = {
    accent: 'bg-ui-accent text-[#062a1f] hover:bg-ui-accent-strong',
    gold: 'bg-ui-gold text-[#2a1d08] hover:bg-ui-gold-strong',
    ghost: 'bg-white/10 text-white hover:bg-white/15',
    danger: 'bg-ui-danger/90 text-[#2a0d08] hover:bg-ui-danger',
  }[tone];
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${small ? 'px-3 py-1 text-[11px]' : 'px-4 py-2 text-[12px]'} ${colors}`}>
      {children}
    </button>
  );
}

function Meter({ value, tone = '#3fbf8e', label }: { value: number; tone?: string; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: tone }} />
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mx-1 mb-3 mt-0 text-[11px] leading-snug text-white/50">{children}</p>;
}

/** A message shown after an action, cleared when the view changes. */
function useFlash() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(id);
  }, [msg]);
  const el = msg ? <p role="status" className="mx-1 mb-3 mt-0 rounded-xl bg-white/10 px-3 py-2 text-[12px] text-white">{msg}</p> : null;
  return [el, setMsg] as const;
}

/** Ask before spending: the confirm card inside an app. */
function Confirm({ title, body, yes, onYes, onNo }: { title: string; body: ReactNode; yes: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="mb-3 rounded-2xl border border-ui-gold/40 bg-ui-gold/10 p-3">
      <p className="m-0 text-[13px] font-semibold text-white">{title}</p>
      <div className="mt-1 text-[12px] leading-snug text-white/75">{body}</div>
      <div className="mt-3 flex gap-2"><Btn onClick={onYes} tone="gold">{yes}</Btn><Btn onClick={onNo} tone="ghost">Cancel</Btn></div>
    </div>
  );
}

const distanceTo = (ctx: AppCtx, d: Destination) => (d.position ? Math.hypot(d.position.x - ctx.here.x, d.position.z - ctx.here.z) : 0);

/** Walk or take a taxi to a place (a row of two buttons, with the result). */
function GoButtons({ ctx, d, onResult }: { ctx: AppCtx; d: Destination | undefined; onResult: (msg: string) => void }) {
  if (!d?.position) return null;
  const m = distanceTo(ctx, d);
  return (
    <div className="flex flex-wrap gap-2">
      <Btn small tone="ghost" onClick={() => { const e = ctx.act.walkTo(d); if (e) onResult(e); }}>Walk there · {Math.round(m)} m</Btn>
      <Btn small tone="gold" disabled={!ctx.canRide || m < 15} onClick={() => ctx.push(`book:${d.id}`)}>Taxi · {ghai(rideFare(m))}</Btn>
    </div>
  );
}

// ---------------------------------------------------------------- Bank

function Bank({ ctx }: { ctx: AppCtx }) {
  const { state } = ctx;
  const now = state.time.totalMinutes;
  const lines = [...state.life.ledger].reverse();
  const groups: { day: string; items: typeof lines }[] = [];
  for (const e of lines) {
    const day = dayLabel(e.t, now);
    const g = groups[groups.length - 1];
    if (g?.day === day) g.items.push(e); else groups.push({ day, items: [e] });
  }
  return (
    <>
      <div className="mb-3 rounded-3xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#1f7a5c,#0b3326)' }}>
        <p className="m-0 text-[11px] uppercase tracking-wider text-white/70">Current account · {ctx.character.name}</p>
        <p className="m-0 mt-1 font-display text-3xl font-bold">{ghai(state.balance)}</p>
        <div className="mt-3 flex gap-4 text-[12px]">
          <span>Today in <b className="text-ui-accent-strong">{signed(state.today.income)}</b></span>
          <span>Today out <b className="text-ui-danger">−{Math.round(state.today.expenses).toLocaleString()}</b></span>
        </div>
      </div>
      <Note>GHAI is AYE’s in-game money. It isn’t real currency and can’t be bought, sold or withdrawn.</Note>
      {groups.length === 0 && <Section><Row title="No transactions yet" sub="Your wages, rent and purchases will appear here." /></Section>}
      {groups.map((g) => (
        <Section key={g.day} title={g.day}>
          {g.items.map((e, i) => (
            <Row key={`${e.t}-${i}`} title={e.label} sub={clock(e.t)} right={<span className={e.amount >= 0 ? 'text-ui-accent-strong' : 'text-white'}>{signed(e.amount)}</span>} />
          ))}
        </Section>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- Wallet

function Wallet({ ctx }: { ctx: AppCtx }) {
  const goal = ctx.state.life.savingsGoal;
  const [draft, setDraft] = useState(goal ? String(goal) : '');
  const [flash, say] = useFlash();
  const n = Math.round(Number(draft));
  const valid = Number.isFinite(n) && n > 0 && n <= 100_000_000;
  return (
    <>
      <div className="mb-3 rounded-3xl p-4 text-[#2a1d08]" style={{ background: 'linear-gradient(135deg,#ecc98a,#b9873a)' }}>
        <p className="m-0 text-[11px] font-semibold uppercase tracking-wider">GHAI wallet</p>
        <p className="m-0 mt-1 font-display text-3xl font-bold">{ghai(ctx.state.balance)}</p>
      </div>
      {flash}
      <Section title="Savings goal">
        <div className="p-3">
          {goal ? (
            <>
              <div className="mb-1 flex justify-between text-[12px] text-white/80"><span>{ghai(Math.min(ctx.state.balance, goal))} of {ghai(goal)}</span><span>{Math.min(100, Math.round((ctx.state.balance / goal) * 100))}%</span></div>
              <Meter value={(ctx.state.balance / goal) * 100} tone="#d4a85a" label="Savings goal" />
              <p className="mb-0 mt-2 text-[11px] text-white/55">{ctx.state.balance >= goal ? 'Reached! Set a bigger one?' : `${ghai(goal - ctx.state.balance)} to go.`}</p>
            </>
          ) : <p className="m-0 text-[12px] text-white/60">No goal set. Saving towards something keeps you on track.</p>}
          <div className="mt-3 flex gap-2">
            <input
              inputMode="numeric" aria-label="Goal in GHAI" placeholder="Amount in GHAI" value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
              className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[12px] text-white outline-none focus:border-ui-gold"
            />
            <Btn small tone="gold" disabled={!valid} onClick={() => { ctx.act.setSavingsGoal(n); say(`Goal set: ${ghai(n)}.`); }}>Set</Btn>
            {goal && <Btn small tone="ghost" onClick={() => { ctx.act.setSavingsGoal(null); setDraft(''); say('Goal cleared.'); }}>Clear</Btn>}
          </div>
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- Jobs

function Jobs({ ctx }: { ctx: AppCtx }) {
  const { state, character } = ctx;
  const [flash, say] = useFlash();
  const [asking, setAsking] = useState(false);
  const career = character.career;
  const level = careerLevel(career, state.workMinutes);
  const pay = Math.round(HOURLY_WAGE[career] * level.pay * equipmentPay(state.equipment, career));
  const next = hoursToNextLevel(career, state.workMinutes);
  const spa = rollSpaDay(state.spa, state.time.totalMinutes);
  const spaLevel = LEVELS[levelOf(spa)];
  const work = ctx.destinations.find((d) => d.id.endsWith(`work.${career}`));
  return (
    <>
      {flash}
      {career === 'none' ? (
        <Section title="Your career"><Row title="No career yet" sub="You chose to start without one. Shifts at Alafia Spa are open to anyone." /></Section>
      ) : (
        <Section title="Your career">
          <Row title={level.title} sub={`${work?.name ?? 'Your workplace'} · ${String(WORK_START_HOUR).padStart(2, '0')}:00–${WORK_END_HOUR}:00`} right={<b>{ghai(pay)}/h</b>} />
          <Row title={next === null ? 'Top of your ladder' : `${Math.ceil(next)} more hours to your next promotion`} sub={`${Math.round(state.workMinutes / 60)} hours worked in total`} />
          <Row title={isWorkingHours(state.time) ? 'Working hours now' : 'Outside working hours'} sub="You’re paid for each minute you spend at your workplace in working hours." />
          {work && <div className="p-3"><GoButtons ctx={ctx} d={work} onResult={say} /></div>}
        </Section>
      )}
      <Section title="Openings">
        <Row
          title="Massage therapist · Alafia Spa"
          sub={spa.employed
            ? `You work here: ${spaLevel.title}, ${spa.sessionsTotal} sessions, ${ghai(spa.earnedTotal)} earned. Shifts ${SHIFT_START}:00–${SHIFT_END}:00, clock in at the spa.`
            : `Shifts ${SHIFT_START}:00–${SHIFT_END}:00. You keep ${Math.round(LEVELS[0].share * 100)}% of each treatment, plus tips; more as you get better.`}
          right={spa.employed ? <span className="text-ui-accent-strong">Hired</span> : <Btn small onClick={() => setAsking(true)}>Apply</Btn>}
        />
      </Section>
      {asking && !spa.employed && (
        <Confirm title="Apply to Alafia Spa?" body="The manager is happy to take you on: you’ll be hired straight away and can clock in at the front desk during shift hours." yes="Apply" onYes={() => { ctx.act.spaHire(); setAsking(false); say('You’re hired at Alafia Spa. Clock in at the front desk.'); }} onNo={() => setAsking(false)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- people: Messages, Phone, Contacts

/** Everyone you've met (you have their number), closest first. */
function contacts(state: GameState): { r: Resident; points: number; lastPhone?: number }[] {
  return Object.entries(state.relationships)
    .flatMap(([id, rel]) => { const r = residentById(id); return r ? [{ r, points: rel.points, lastPhone: rel.lastPhone }] : []; })
    .sort((a, b) => b.points - a.points);
}

const phonedToday = (ctx: AppCtx, lastPhone?: number) => lastPhone === gameDay(ctx.state.time.totalMinutes);

function Avatar({ r }: { r: Resident }) {
  const initials = r.name.split(' ').filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ui-accent/80 to-ui-gold/80 text-[12px] font-bold text-[#0b1a14]">{initials}</span>;
}

/** What you'd call them: their first name, past a title like "Captain" or "Dr." */
const firstName = (r: Resident) => r.name.split(' ').find((w) => !/^(Captain|Officer|Dr\.?|Chief|Mr\.?|Mrs\.?|Ms\.?)$/.test(w)) ?? r.name;

function cityOf(r: Resident) {
  try { return districtById(r.district).city.name; } catch { return ''; }
}

function Messages({ ctx }: { ctx: AppCtx }) {
  const people = contacts(ctx.state);
  const open = ctx.view?.startsWith('thread:') ? ctx.view.slice(7) : null;
  if (open) return <Thread ctx={ctx} id={open} />;
  return (
    <>
      <Note>Residents are computer-controlled people in AYE, not other players.</Note>
      {people.length === 0 && <Section><Row title="No contacts yet" sub="Chat to people around the city (press E next to them) and they’ll give you their number." /></Section>}
      {people.length > 0 && (
        <Section>
          {people.map(({ r }) => {
            const t = ctx.phone.threads[r.id];
            const last = t?.[t.length - 1];
            return (
              <button key={r.id} type="button" onClick={() => ctx.push(`thread:${r.id}`)} className="flex w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 text-left last:border-b-0 hover:bg-white/[0.05]">
                <Avatar r={r} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2"><span className="truncate text-[13px] font-medium text-white">{r.name}</span>{last && <span className="text-[10px] text-white/45">{clock(last.t)}</span>}</div>
                  <div className="truncate text-[11px] text-white/55">{last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : `${r.role} · ${cityOf(r)}`}</div>
                </div>
              </button>
            );
          })}
        </Section>
      )}
    </>
  );
}

function addToThread(setPhone: AppCtx['setPhone'], id: string, msgs: PhoneMessage[]) {
  setPhone((p) => ({ ...p, threads: { ...p.threads, [id]: [...(p.threads[id] ?? []), ...msgs].slice(-MAX_THREAD) } }));
}

function Thread({ ctx, id }: { ctx: AppCtx; id: string }) {
  const r = residentById(id);
  const rel = ctx.state.relationships[id];
  const [typing, setTyping] = useState(false);
  const thread = ctx.phone.threads[id] ?? [];
  if (!r || !rel) return <Section><Row title="This contact isn’t in your phone." /></Section>;
  const done = phonedToday(ctx, rel.lastPhone);
  const send = (textId: string) => {
    const text = TEXTS.find((x) => x.id === textId)!.text;
    const t = ctx.state.time.totalMinutes;
    const reply = replyFrom(r, rel.points, textId);
    ctx.act.phoneFriend(id, 'text');
    addToThread(ctx.setPhone, id, [{ from: 'me', text, t }]);
    setTyping(true);
    // They read it and type back
    setTimeout(() => { setTyping(false); addToThread(ctx.setPhone, id, [{ from: 'them', text: reply, t }]); }, 1400);
  };
  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-2 flex items-center gap-3 px-1">
        <Avatar r={r} />
        <div><div className="text-[13px] font-semibold text-white">{r.name}</div><div className="text-[11px] text-white/55">{r.role} · {cityOf(r)} · {FRIENDSHIP_LEVELS[friendshipLevel(rel.points)].name}</div></div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-1 pb-3">
        {thread.length === 0 && <p className="my-6 text-center text-[11px] text-white/45">Say hello: a text a day keeps a friendship going.</p>}
        {thread.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[12.5px] leading-snug ${m.from === 'me' ? 'self-end rounded-br-md bg-ui-accent text-[#062a1f]' : 'self-start rounded-bl-md bg-white/12 text-white'}`} style={m.from === 'them' ? { background: 'rgba(255,255,255,0.12)' } : undefined}>
            {m.text}
            <span className={`ml-2 align-bottom text-[9px] ${m.from === 'me' ? 'text-[#062a1f]/60' : 'text-white/40'}`}>{clock(m.t)}</span>
          </div>
        ))}
        {typing && <div className="self-start rounded-2xl rounded-bl-md px-3 py-2 text-[12px] text-white/70" style={{ background: 'rgba(255,255,255,0.12)' }} aria-label={`${firstName(r)} is typing`}>• • •</div>}
      </div>
      <div className="sticky bottom-0 -mx-3 border-t border-white/10 bg-black/40 px-3 py-2 backdrop-blur">
        {done ? (
          <p className="m-0 text-center text-[11px] text-white/55">You’ve been in touch with {firstName(r)} today. Text again tomorrow, or find them in town.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {TEXTS.map((x) => <button key={x.id} type="button" onClick={() => send(x.id)} disabled={typing || !!ctx.state.summary} className="rounded-full border border-white/20 px-3 py-1 text-[11.5px] text-white hover:bg-white/10 disabled:opacity-40">{x.text}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}

function CallScreen({ ctx, r }: { ctx: AppCtx; r: Resident }) {
  const [talking, setTalking] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setTalking(true), 1800);
    return () => clearTimeout(a);
  }, []);
  const rel = ctx.state.relationships[r.id];
  if (!rel) return null;
  const hangUp = () => {
    if (talking) {
      ctx.act.phoneFriend(r.id, 'call');
      addToThread(ctx.setPhone, r.id, [{ from: 'me', text: `📞 Call, ${PHONE_CONTACT.call.minutes} min`, t: ctx.state.time.totalMinutes }]);
    }
    ctx.pop();
  };
  return (
    <div className="flex min-h-full flex-col items-center justify-between py-8 text-center">
      <div>
        <div className="mx-auto mb-3 grid scale-150 place-items-center"><Avatar r={r} /></div>
        <p className="m-0 mt-6 font-display text-xl font-semibold text-white">{r.name}</p>
        <p className="m-0 mt-1 text-[12px] text-white/60">{talking ? `Connected · ${cityOf(r)}` : 'Calling…'}</p>
        {talking && <p className="mx-4 mt-6 rounded-2xl px-4 py-3 text-[13px] italic leading-snug text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>“{r.lines[friendshipLevel(rel.points)]}”</p>}
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="m-0 text-[11px] text-white/50">{talking ? `Hang up after a chat: ${PHONE_CONTACT.call.minutes} minutes pass.` : 'Hang up now and nothing is used up.'}</p>
        <button type="button" onClick={hangUp} aria-label="Hang up" className="grid h-14 w-14 place-items-center rounded-full bg-[#e5484d] text-white shadow-lg"><Glyph name="phone" className="h-6 w-6 rotate-[135deg]" /></button>
      </div>
    </div>
  );
}

function Dialer({ ctx }: { ctx: AppCtx }) {
  const people = contacts(ctx.state);
  const calling = ctx.view?.startsWith('call:') ? residentById(ctx.view.slice(5)) : null;
  if (calling) return <CallScreen key={calling.id} ctx={ctx} r={calling} />;
  return (
    <>
      {people.length === 0 && <Section><Row title="Nobody to call yet" sub="Meet people around the city first." /></Section>}
      {people.length > 0 && (
        <Section title="Favourites & contacts">
          {people.map(({ r, lastPhone }) => (
            <Row key={r.id} title={r.name} sub={phonedToday(ctx, lastPhone) ? 'Spoke today' : `${r.role} · ${cityOf(r)}`}
              right={<Btn small disabled={phonedToday(ctx, lastPhone) || !!ctx.state.summary} onClick={() => ctx.push(`call:${r.id}`)}>Call</Btn>} />
          ))}
        </Section>
      )}
      <Note>A call is once a day per person, takes about {PHONE_CONTACT.call.minutes} minutes and does more for a friendship than a text.</Note>
    </>
  );
}

function Contacts({ ctx }: { ctx: AppCtx }) {
  const people = contacts(ctx.state);
  return (
    <>
      {people.length === 0 && <Section><Row title="No contacts yet" sub="Talk to residents around the city to get to know them." /></Section>}
      {people.map(({ r, points, lastPhone }) => {
        const lvl = friendshipLevel(points);
        const next = FRIENDSHIP_LEVELS[lvl + 1];
        const local = r.district === ctx.state.districtId;
        return (
          <Section key={r.id}>
            <div className="flex items-center gap-3 p-3">
              <Avatar r={r} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-white">{r.name}</div>
                <div className="text-[11px] text-white/55">{r.role} · {cityOf(r)}</div>
                <div className="mt-1.5"><Meter value={points} label={`Friendship with ${r.name}`} /></div>
                <div className="mt-1 text-[10.5px] text-white/50">{FRIENDSHIP_LEVELS[lvl].name}{next ? ` · ${next.points - points} points to ${next.name}` : ''}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-3 pb-3">
              <Btn small tone="ghost" onClick={() => ctx.openApp('messages', `thread:${r.id}`)}>Message</Btn>
              <Btn small tone="ghost" disabled={phonedToday(ctx, lastPhone)} onClick={() => ctx.openApp('phone', `call:${r.id}`)}>Call</Btn>
              {local ? <Btn small tone="ghost" onClick={() => ctx.act.onGo({ to: 'friend', residentId: r.id })}>Find in town</Btn> : <span className="self-center text-[11px] text-white/45">Lives in another city</span>}
            </div>
          </Section>
        );
      })}
      {people.length > 0 && <Note>Everyone here is a computer-controlled resident of AYE.</Note>}
    </>
  );
}

// ---------------------------------------------------------------- Cars

function Cars({ ctx }: { ctx: AppCtx }) {
  const { state } = ctx;
  const [flash, say] = useFlash();
  const [selling, setSelling] = useState<string | null>(null);
  const dealer = ctx.destinations.find((d) => d.id.includes('.cars.'));
  const owned = state.cars;
  return (
    <>
      {flash}
      <Section title="Your garage">
        {owned.length === 0 && <Row title="No car yet" sub="Buy one at the dealership, then drive it anywhere. Fuel is paid as you go." />}
        {owned.map((c) => {
          const m = carById(c.id);
          if (!m) return null;
          const where = c.parked ? (c.parked.districtId === state.districtId ? 'Parked in this city' : `Parked in ${districtById(c.parked.districtId).city.name}`) : 'With you';
          return (
            <Row key={c.id} title={<span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full border border-white/40" style={{ background: c.color }} />{m.name}</span>}
              sub={`${m.kind} · ${where} · resale ${ghai(carResale(m))}`}
              right={<Btn small tone="ghost" onClick={() => setSelling(c.id)}>Sell</Btn>} />
          );
        })}
      </Section>
      {selling && carById(selling) && (
        <Confirm title={`Sell your ${carById(selling)!.name}?`} body={`The dealer pays ${ghai(carResale(carById(selling)!))} (half the new price), straight into your account.`} yes="Sell"
          onYes={() => { const m = carById(selling)!; ctx.act.sellCar(selling); setSelling(null); say(`Sold. ${ghai(carResale(m))} is in your account.`); }} onNo={() => setSelling(null)} />
      )}
      <Section title={dealer ? `Showroom · ${dealer.name}` : 'Showroom'}>
        {CARS.map((m) => {
          const have = owned.some((c) => c.id === m.id);
          return <Row key={m.id} title={m.name} sub={`${m.kind} · ${m.fuelPerKm} GHAI/km fuel`} right={have ? <span className="text-ui-accent-strong">Yours</span> : <span className={state.balance >= m.price ? 'text-white' : 'text-white/45'}>{ghai(m.price)}</span>} />;
        })}
      </Section>
      {dealer ? <><Note>Choose the colour and collect the keys at the dealership.</Note><GoButtons ctx={ctx} d={dealer} onResult={say} /></> : <Note>This city has no car dealership. The one in Lagos is on Marina Boulevard.</Note>}
    </>
  );
}

// ---------------------------------------------------------------- Houses (and OGM Homes)

function Houses({ ctx }: { ctx: AppCtx }) {
  const { state } = ctx;
  const [flash, say] = useFlash();
  const [buying, setBuying] = useState<string | null>(null);
  const mine = homeById(state.home);
  const owned = state.owned.map(homeById).filter((h) => !!h);
  const sale = homesForSale();
  const toLet = allHomes().filter((h) => h.district === state.districtId && !forSale(h) && h.id !== state.home);
  const dest = (id: string) => ctx.destinations.find((d) => d.id.endsWith(`home.${id}`));
  const b = buying ? homeById(buying) : undefined;
  return (
    <>
      {flash}
      <Section title="Where you live">
        {mine
          ? <Row title={mine.name} sub={state.owned.includes(mine.id) ? 'You own it: no rent.' : `Renting: ${ghai(mine.rentPerNight)} a night, paid when you sleep.`} right={dest(mine.id) ? <Btn small tone="ghost" onClick={() => ctx.act.onGo({ to: 'home' })}>Go home</Btn> : undefined} />
          : <Row title="No home" sub="You’ll sleep rough. Rent a place below, or buy from OGM Homes." />}
      </Section>
      {owned.length > 0 && (
        <Section title="Homes you own">
          {owned.map((h) => <Row key={h.id} title={h.name} sub={`${h.kind} · ${districtById(h.district).city.name}`} right={h.id === state.home ? <span className="text-ui-accent-strong">Home</span> : <Btn small tone="ghost" onClick={() => { ctx.act.moveIn(h.id); say(`You’ve moved into ${h.name}.`); }}>Move in</Btn>} />)}
        </Section>
      )}
      {b && (
        <Confirm title={`Buy ${b.name}?`} body={<>{ghai(b.price!)} once, from OGM Homes. It’s yours for good: no rent, and you move in today. Your furniture comes with you.</>} yes={`Pay ${ghai(b.price!)}`}
          onYes={() => { ctx.act.buyHome(b.id); setBuying(null); say(`Congratulations! ${b.name} is yours.`); }} onNo={() => setBuying(null)} />
      )}
      <Section title="OGM Homes · for sale">
        {sale.map((h) => {
          const have = state.owned.includes(h.id);
          return (
            <Row key={h.id} title={h.name} sub={`${BAND_LABEL[h.band ?? 'middle']} · ${h.kind} · ${districtById(h.district).city.name}`}
              right={have ? <span className="text-ui-accent-strong">Owned</span> : <div className="flex flex-col items-end gap-1"><span>{ghai(h.price!)}</span><Btn small tone="gold" disabled={state.balance < h.price!} onClick={() => setBuying(h.id)}>Buy</Btn></div>} />
          );
        })}
      </Section>
      <Section title="To let in this city">
        {toLet.length === 0 && <Row title="Nothing else to let here right now" />}
        {toLet.map((h) => <Row key={h.id} title={h.name} sub={`${h.kind} · move-in fee ${ghai(moveInFee(h))}`} right={<span>{ghai(h.rentPerNight)}/night</span>} />)}
      </Section>
      <Note>To rent, view the place first: walk to its front door and press E.</Note>
    </>
  );
}

// ---------------------------------------------------------------- Shops, Ride

function Shops({ ctx }: { ctx: AppCtx }) {
  const [flash, say] = useFlash();
  const shops = ctx.destinations.filter((d) => d.categories.includes('shopping') || d.categories.includes('restaurants'));
  return (
    <>
      {flash}
      {(['shopping', 'restaurants'] as const).map((c) => (
        <Section key={c} title={c === 'shopping' ? 'Shops' : 'Food & drink'}>
          {shops.filter((d) => d.categories[0] === c).map((d) => (
            <div key={d.id} className="border-b border-white/[0.06] px-3 py-2.5 last:border-b-0">
              <div className="flex justify-between gap-2"><span className="text-[13px] font-medium text-white">{d.name}</span>{d.position && <span className="text-[11px] text-white/45">{Math.round(distanceTo(ctx, d))} m</span>}</div>
              <div className="mb-2 text-[11px] text-white/55">{d.kind} · {d.note}</div>
              {d.status === 'planned' ? <span className="text-[11px] text-white/45">Coming soon</span> : <GoButtons ctx={ctx} d={d} onResult={say} />}
            </div>
          ))}
        </Section>
      ))}
    </>
  );
}

function Ride({ ctx }: { ctx: AppCtx }) {
  const [q, setQ] = useState('');
  const places = ctx.destinations.filter((d) => d.position && d.status !== 'planned' && distanceTo(ctx, d) >= 15)
    .filter((d) => !q.trim() || `${d.name} ${d.kind}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => distanceTo(ctx, a) - distanceTo(ctx, b));
  return (
    <>
      {!ctx.canRide && <Note>Taxis pick you up on the street. Step outside first.</Note>}
      <input aria-label="Where to?" placeholder="Where to?" value={q} onChange={(e) => setQ(e.target.value)}
        className="mb-3 w-full rounded-full border border-white/15 bg-black/30 px-4 py-2 text-[13px] text-white outline-none focus:border-ui-gold" />
      <Section title="Destinations">
        {places.length === 0 && <Row title="No matches" />}
        {places.map((d) => {
          const m = distanceTo(ctx, d);
          return <Row key={d.id} onClick={() => ctx.push(`book:${d.id}`)} disabled={!ctx.canRide} title={d.name} sub={`${d.kind} · ${Math.round(m)} m · about ${rideMinutes(m)} min`} right={ghai(rideFare(m))} />;
        })}
      </Section>
    </>
  );
}

/** The booking card: shared by Ride and every "Taxi" button. */
export function Booking({ ctx, id }: { ctx: AppCtx; id: string }) {
  const [err, setErr] = useState<string | null>(null);
  const d = ctx.destinations.find((x) => x.id === id);
  if (!d?.position) return <Section><Row title="That place can’t be reached by taxi." /></Section>;
  const m = distanceTo(ctx, d);
  const fare = rideFare(m);
  return (
    <>
      <div className="mb-3 rounded-3xl p-4 text-[#2a1d08]" style={{ background: 'linear-gradient(135deg,#f6d77a,#d9a520)' }}>
        <p className="m-0 text-[11px] font-semibold uppercase tracking-wider">AYE Ride</p>
        <p className="m-0 mt-1 font-display text-xl font-bold">{d.name}</p>
        <p className="m-0 text-[12px]">{d.kind}</p>
      </div>
      <Section>
        <Row title="From" right={ctx.whereabouts.place} />
        <Row title="Distance" right={`${Math.round(m)} m`} />
        <Row title="Journey" right={`about ${rideMinutes(m)} min, pick-up included`} />
        <Row title="Fare" right={<b>{ghai(fare)}</b>} />
      </Section>
      {err && <p role="alert" className="mx-1 mb-3 mt-0 rounded-xl bg-ui-danger/20 px-3 py-2 text-[12px] text-white">{err}</p>}
      <Btn tone="gold" disabled={!ctx.canRide || ctx.state.balance < fare} onClick={() => setErr(ctx.act.ride(d))}>{ctx.state.balance < fare ? 'Not enough GHAI' : `Book for ${ghai(fare)}`}</Btn>
      <Note>Your driver is computer-controlled. The fare is taken when you’re dropped off.</Note>
    </>
  );
}

// ---------------------------------------------------------------- Health, Spa, Events, Courses, Gist

function Health({ ctx }: { ctx: AppCtx }) {
  const { state, character } = ctx;
  const mood = moodLabel(currentMood(state));
  const todo = suggestions(state, character.career);
  return (
    <>
      <div className="mb-3 rounded-3xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#f07a7a,#8a2a3a)' }}>
        <p className="m-0 text-[11px] uppercase tracking-wider text-white/75">Mood</p>
        <p className="m-0 mt-1 font-display text-2xl font-bold">{mood}</p>
        <p className="m-0 text-[12px] text-white/80">{hungerLabel(state.fullness)}</p>
      </div>
      <Section title="Your needs">
        <div className="space-y-2.5 p-3">
          <div><div className="mb-1 flex justify-between text-[12px] text-white/80"><span>Hunger</span><span>{Math.round(state.fullness)}</span></div><Meter value={state.fullness} tone="#f0a35e" label="Hunger" /></div>
          {NEED_KEYS.map((k) => (
            <div key={k}><div className="mb-1 flex justify-between text-[12px] text-white/80"><span>{NEED_LABEL[k]}</span><span>{Math.round(state.needs[k])}</span></div><Meter value={state.needs[k]} tone={state.needs[k] < 25 ? '#ec8b7f' : '#3fbf8e'} label={NEED_LABEL[k]} /></div>
          ))}
        </div>
      </Section>
      {todo.length > 0 && (
        <Section title="Look after yourself">
          {todo.slice(0, 5).map((s) => <Row key={s.text} title={s.text} sub={s.why} right={<Btn small tone="ghost" onClick={() => ctx.act.onGo(s.link)}>Go</Btn>} />)}
        </Section>
      )}
      <Section title="Treatments"><Row title="Alafia Spa" sub="Massages that restore your energy and mood" right={<Btn small tone="ghost" onClick={() => ctx.openApp('spa')}>Open</Btn>} /></Section>
    </>
  );
}

function Spa({ ctx }: { ctx: AppCtx }) {
  const [flash, say] = useFlash();
  const s = ctx.district.spa;
  const open = spaOpen(ctx.state.time.hour);
  const dest: Destination | undefined = s ? { id: `${ctx.district.id}.spa`, name: s.name, kind: s.kind, categories: ['shopping'], status: 'open', note: '', position: { x: s.door[0], z: s.door[2] } } : undefined;
  return (
    <>
      {flash}
      <div className="mb-3 rounded-3xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#c9a77a,#5a3e22)' }}>
        <p className="m-0 font-display text-xl font-bold">Alafia Spa</p>
        <p className="m-0 text-[12px] text-white/80">Open {OPEN_HOUR}:00–{CLOSE_HOUR}:00 · {open ? 'Open now' : 'Closed now'}</p>
      </div>
      {s && dest ? <div className="mb-3"><GoButtons ctx={ctx} d={dest} onResult={say} /></div> : <Note>Alafia Spa is in Lagos, on the Marina. Fly or take the coach there from Travel.</Note>}
      <Section title="Treatments">
        {SERVICES.map((v) => <Row key={v.id} title={v.name} sub={`${v.minutes} min${v.couples ? ' · for two, with a friend' : ''}`} right={ghai(v.price)} />)}
      </Section>
      <Note>Book at the front desk when you arrive. Working there? See Jobs.</Note>
    </>
  );
}

function Events({ ctx }: { ctx: AppCtx }) {
  const day = gameDay(ctx.state.time.totalMinutes);
  const days = [0, 1, 2, 3].map((i) => ({ i, e: eventToday(ctx.state.districtId, day + i) }));
  const hour = ctx.state.time.hour;
  return (
    <>
      <Note>What’s on in {ctx.district.city.name}. Join in while it’s on for an extra boost.</Note>
      {days.map(({ i, e }) => (
        <Section key={i} title={i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `In ${i} days`}>
          {e ? (
            <Row title={e.title(ctx.district)} sub={`${String(e.from).padStart(2, '0')}:00–${String(e.to % 24).padStart(2, '0')}:00 · ${e.perk}`}
              right={i === 0 && hour < e.to ? <Btn small tone="ghost" onClick={() => ctx.act.onGo(e.link)}>{hour >= e.from ? 'Go now' : 'Directions'}</Btn> : undefined} />
          ) : <Row title="Nothing special on" sub="A quiet day in the city." />}
        </Section>
      ))}
    </>
  );
}

function Courses({ ctx }: { ctx: AppCtx }) {
  const skills = ctx.state.life.skills;
  return (
    <>
      <Note>Skills grow from what you do every day. Higher levels unlock perks in Life OS.</Note>
      <Section title="Your skills">
        {SKILLS.map((s) => (
          <div key={s.id} className="border-b border-white/[0.06] px-3 py-2.5 last:border-b-0">
            <div className="mb-1 flex justify-between text-[13px] text-white"><span>{s.label}</span><span className="text-white/60">Level {skillLevel(skills[s.id])}</span></div>
            <Meter value={skillProgress(skills[s.id]) * 100} tone="#5b8def" label={`${s.label} progress`} />
            <div className="mt-1 text-[11px] text-white/55">{s.how}</div>
          </div>
        ))}
      </Section>
      {ctx.character.career === 'student' && <Section><Row title="AYE Global University" sub="Your timetable and grades are on campus: the School button there." right={<Btn small tone="ghost" onClick={() => ctx.act.onGo({ to: 'work' })}>Go</Btn>} /></Section>}
    </>
  );
}

function Gist({ ctx }: { ctx: AppCtx }) {
  const { state, district } = ctx;
  const day = gameDay(state.time.totalMinutes);
  const e = eventToday(state.districtId, day);
  const cheapest = homesForSale()[0];
  const stories: { tag: string; title: string; body: string }[] = [];
  if (e) stories.push({ tag: 'What’s on', title: e.title(district), body: `${String(e.from).padStart(2, '0')}:00–${String(e.to % 24).padStart(2, '0')}:00 today. ${e.perk}` });
  for (const c of [...state.life.celebrations].reverse().slice(0, 3)) stories.push({ tag: 'You', title: c.kind, body: c.text });
  if (state.summary?.promotedTo) stories.push({ tag: 'Careers', title: `${ctx.character.name} promoted`, body: `Now ${state.summary.promotedTo}.` });
  if (cheapest) stories.push({ tag: 'Property', title: 'OGM Homes listings', body: `${homesForSale().length} homes for sale, from ${ghai(cheapest.price!)} (${cheapest.name}).` });
  stories.push({ tag: 'Motoring', title: 'New at the dealership', body: 'The Volta EV electric SUV and the Sovereign flagship saloon are in the showroom.' });
  stories.push({ tag: 'Wellness', title: 'Alafia Spa is hiring', body: `Massage therapists wanted for shifts ${SHIFT_START}:00–${SHIFT_END}:00. Apply in Jobs.` });
  return (
    <>
      <Note>Songhai Gist: the news from your city and your own life, written from what’s happening in your game.</Note>
      {stories.map((s, i) => (
        <article key={i} className="mb-2.5 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-ui-gold">{s.tag}</p>
          <h4 className="m-0 mt-0.5 text-[14px] font-semibold text-white">{s.title}</h4>
          <p className="m-0 mt-1 text-[12px] leading-snug text-white/70">{s.body}</p>
        </article>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- Calculator, Camera, Photos

function Calculator() {
  const [shown, setShown] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const apply = (a: number, b: number, o: string) => (o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : b === 0 ? NaN : a / b);
  const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 1e8) / 1e8) : 'Error');
  const press = (k: string) => {
    if (/^[0-9]$/.test(k)) { setShown((s) => (fresh || s === '0' ? k : s.length < 12 ? s + k : s)); setFresh(false); return; }
    if (k === '.') { setShown((s) => (fresh ? '0.' : s.includes('.') ? s : s + '.')); setFresh(false); return; }
    if (k === 'C') { setShown('0'); setAcc(null); setOp(null); setFresh(true); return; }
    if (k === '±') { setShown((s) => (s.startsWith('-') ? s.slice(1) : s === '0' ? s : `-${s}`)); return; }
    if (k === '%') { setShown((s) => fmt(Number(s) / 100)); return; }
    const cur = Number(shown);
    const result = acc !== null && op && !fresh ? apply(acc, cur, op) : cur;
    if (k === '=') { setShown(fmt(result)); setAcc(null); setOp(null); setFresh(true); return; }
    setAcc(result); setOp(k); setShown(fmt(result)); setFresh(true);
  };
  const keys = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];
  return (
    <div className="flex min-h-full flex-col justify-end pb-2">
      <output aria-live="polite" className="mb-3 block truncate px-2 text-right font-display text-5xl font-light text-white">{shown}</output>
      <div className="grid grid-cols-4 gap-2.5">
        {keys.map((k) => (
          <button key={k} type="button" onClick={() => press(k)}
            className={`h-14 rounded-full text-xl font-medium transition active:scale-95 ${k === '0' ? 'col-span-2' : ''} ${'÷×−+='.includes(k) ? (op === k && fresh ? 'bg-white text-ui-gold' : 'bg-ui-gold text-white') : 'C±%'.includes(k) ? 'bg-white/30 text-black' : 'bg-white/15 text-white'}`}>{k}</button>
        ))}
      </div>
    </div>
  );
}

function Camera({ ctx }: { ctx: AppCtx }) {
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const snap = async () => {
    setBusy(true); setErr(null);
    if (ctx.sound) shutter();
    const src = await takePhoto();
    setBusy(false);
    if (!src) { setErr('The camera couldn’t take that picture. Try again.'); return; }
    setLast(src);
    const t = ctx.state.time.totalMinutes;
    ctx.setPhone((p) => ({ ...p, photos: [...p.photos, { id: `${t}-${p.photos.length}-${src.length}`, src, t, place: ctx.whereabouts.place }].slice(-MAX_PHOTOS) }));
  };
  return (
    <div className="flex min-h-full flex-col items-center justify-between py-4 text-center">
      <div className="w-full">
        <p className="m-0 text-[12px] text-white/70">Points where you’re looking: move the view to frame your shot, then press the shutter.</p>
        <p className="m-0 mt-1 text-[11px] text-white/45">{ctx.whereabouts.place}</p>
      </div>
      {last && <button type="button" onClick={() => ctx.openApp('photos')} className="overflow-hidden rounded-xl border border-white/20"><img src={last} alt="Your last photo" className="block max-h-40" /></button>}
      {err && <p role="alert" className="m-0 text-[12px] text-ui-danger">{err}</p>}
      <div className="flex flex-col items-center gap-2">
        <button type="button" onClick={snap} disabled={busy} aria-label="Take a photo" className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-white/20 transition active:scale-90 disabled:opacity-50"><span className="h-11 w-11 rounded-full bg-white" /></button>
        <p className="m-0 text-[10.5px] text-white/45">Photos stay on this device ({ctx.phone.photos.length}/{MAX_PHOTOS}).</p>
      </div>
    </div>
  );
}

function Photos({ ctx }: { ctx: AppCtx }) {
  const photos = [...ctx.phone.photos].reverse();
  const open = ctx.view?.startsWith('photo:') ? ctx.phone.photos.find((p) => p.id === ctx.view!.slice(6)) : null;
  if (open) {
    return (
      <div>
        <img src={open.src} alt={`Taken at ${open.place}`} className="mb-3 block w-full rounded-2xl" />
        <p className="m-0 mb-3 text-[12px] text-white/70">{open.place} · {dayLabel(open.t, ctx.state.time.totalMinutes)}, {clock(open.t)}</p>
        <Btn tone="danger" onClick={() => { ctx.setPhone((p) => ({ ...p, photos: p.photos.filter((x) => x.id !== open.id) })); ctx.pop(); }}>Delete photo</Btn>
      </div>
    );
  }
  return photos.length === 0 ? (
    <Section><Row title="No photos yet" sub="Take some with the Camera." right={<Btn small tone="ghost" onClick={() => ctx.openApp('camera')}>Camera</Btn>} /></Section>
  ) : (
    <div className="grid grid-cols-3 gap-1">
      {photos.map((p) => <button key={p.id} type="button" onClick={() => ctx.push(`photo:${p.id}`)} className="aspect-square overflow-hidden rounded-md"><img src={p.src} alt={`Taken at ${p.place}`} className="h-full w-full object-cover" /></button>)}
    </div>
  );
}

// ---------------------------------------------------------------- Help, Settings

function Help() {
  const topics: [string, string][] = [
    ['Moving', 'WASD or the arrow keys to walk, Shift to run. Click or tap the ground to walk there. On a phone or tablet, use the stick.'],
    ['Doing things', 'Press E (or the prompt button) next to a door, a counter, a person or furniture.'],
    ['Your phone', 'P opens and closes it. Esc goes back. L opens Life OS on its own; M opens the map if you have the Smartphone upgrade.'],
    ['Money', 'You earn GHAI at work (09:00–17:00 at your workplace) and on shifts. Living costs, rent and purchases come out of your account: see Bank.'],
    ['Homes', 'Everyone starts with a rented flat. Rent is paid each night you sleep there. Buy a home from OGM Homes and there’s no rent at all.'],
    ['Needs', 'Eat, sleep, wash, have fun and see people. Very hungry or exhausted, you’re paid half. Health shows what to do next.'],
    ['People', 'Residents are computer-controlled, never other players. Chat to them in person, then text or call them once a day.'],
    ['Saving', 'The game saves on this device as you play.'],
  ];
  return <>{topics.map(([t, b]) => <Section key={t} title={t}><p className="m-0 p-3 text-[12px] leading-relaxed text-white/80">{b}</p></Section>)}</>;
}

function Settings({ ctx }: { ctx: AppCtx }) {
  const { phone, setPhone } = ctx;
  const toggle = (k: 'notifications' | 'sound') => setPhone((p) => ({ ...p, [k]: !p[k] }));
  const move = (id: AppId, by: -1 | 1) => setPhone((p) => {
    const i = p.order.indexOf(id), j = i + by;
    if (i < 0 || j < 0 || j >= p.order.length) return p;
    const order = [...p.order];
    [order[i], order[j]] = [order[j], order[i]];
    return { ...p, order };
  });
  const toDock = (id: AppId) => setPhone((p) => {
    if (p.dock.includes(id)) return { ...p, dock: p.dock.filter((x) => x !== id), order: [...p.order, id] };
    if (p.dock.length >= 4) return p;
    return { ...p, dock: [...p.dock, id], order: p.order.filter((x) => x !== id) };
  });
  const sw = (on: boolean, label: string, onClick: () => void) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-ui-accent' : 'bg-white/20'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
  if (ctx.view === 'arrange') {
    return (
      <>
        <Note>The dock holds up to four apps. Move apps up or down to reorder your home screen.</Note>
        <Section title={`Dock (${phone.dock.length}/4)`}>
          {phone.dock.map((id) => <Row key={id} title={appById(id)!.name} right={<Btn small tone="ghost" onClick={() => toDock(id)}>Remove</Btn>} />)}
        </Section>
        <Section title="Home screen">
          {phone.order.map((id, i) => (
            <Row key={id} title={appById(id)!.name} right={
              <div className="flex gap-1">
                <Btn small tone="ghost" disabled={i === 0} onClick={() => move(id, -1)}>↑</Btn>
                <Btn small tone="ghost" disabled={i === phone.order.length - 1} onClick={() => move(id, 1)}>↓</Btn>
                <Btn small tone="ghost" disabled={phone.dock.length >= 4} onClick={() => toDock(id)}>Dock</Btn>
              </div>
            } />
          ))}
        </Section>
        <Btn tone="ghost" onClick={() => setPhone((p) => ({ ...p, dock: [...DEFAULT_DOCK], order: APPS.map((a) => a.id).filter((x) => !DEFAULT_DOCK.includes(x)) }))}>Reset layout</Btn>
      </>
    );
  }
  return (
    <>
      <Section title="Wallpaper">
        <div className="grid grid-cols-5 gap-2 p-3">
          {WALLPAPERS.map((w) => (
            <button key={w.id} type="button" onClick={() => setPhone((p) => ({ ...p, wallpaper: w.id }))} aria-label={w.name} aria-pressed={phone.wallpaper === w.id}
              className={`aspect-[9/16] rounded-lg border-2 ${phone.wallpaper === w.id ? 'border-ui-gold' : 'border-transparent'}`} style={{ background: WALLPAPER_CSS[w.id] }} />
          ))}
        </div>
      </Section>
      <Section title="Notifications & sound">
        <Row title="Notifications" sub="Alerts for money, your morning statement, promotions and what’s on" right={sw(phone.notifications, 'Notifications', () => toggle('notifications'))} />
        <Row title="Phone sounds" sub={ctx.sound || !phone.sound ? 'Key ticks, the camera and the notification chime' : 'Game sound is off in Life OS settings'} right={sw(phone.sound, 'Phone sounds', () => toggle('sound'))} />
      </Section>
      <Section title="Home screen">
        <Row title="Arrange apps and dock" onClick={() => ctx.push('arrange')} right="›" />
      </Section>
      <Section title="Battery">
        <Row title={`${ctx.battery}%`} sub={ctx.charging ? 'Charging (you’re at home)' : 'Charges whenever you’re at home. Lasts about a day and a half.'} />
      </Section>
      <Section title="About this phone">
        <Row title="Storage" sub={`${phone.photos.length} photos · ${Object.keys(phone.threads).length} conversations · saved on this device`} />
        <Row title="Clear notifications" onClick={() => setPhone((p) => ({ ...p, inbox: [] }))} right="›" />
        <Row title="Game settings" sub="Graphics, sound, routes and saving" onClick={() => ctx.act.openLifeOS()} right="›" />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- the registry of screens

export function AppScreen({ id, ctx }: { id: AppId; ctx: AppCtx }) {
  if (ctx.view?.startsWith('book:')) return <Booking ctx={ctx} id={ctx.view.slice(5)} />;
  switch (id) {
    case 'bank': return <Bank ctx={ctx} />;
    case 'wallet': return <Wallet ctx={ctx} />;
    case 'jobs': return <Jobs ctx={ctx} />;
    case 'messages': return <Messages ctx={ctx} />;
    case 'phone': return <Dialer ctx={ctx} />;
    case 'contacts': return <Contacts ctx={ctx} />;
    case 'cars': return <Cars ctx={ctx} />;
    case 'houses': return <Houses ctx={ctx} />;
    case 'shops': return <Shops ctx={ctx} />;
    case 'ride': return <Ride ctx={ctx} />;
    case 'health': return <Health ctx={ctx} />;
    case 'spa': return <Spa ctx={ctx} />;
    case 'events': return <Events ctx={ctx} />;
    case 'courses': return <Courses ctx={ctx} />;
    case 'gist': return <Gist ctx={ctx} />;
    case 'calculator': return <Calculator />;
    case 'camera': return <Camera ctx={ctx} />;
    case 'photos': return <Photos ctx={ctx} />;
    case 'help': return <Help />;
    case 'settings': return <Settings ctx={ctx} />;
    // Maps, Travel and Life OS open the game's own panels (Phone.tsx hands them over)
    default: return null;
  }
}
