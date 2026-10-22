import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Character } from '../CharacterCreation';
import type { GameState } from '../../lib/gameState';
import { HOURLY_LIVING_COST, HOURLY_WAGE, WORK_END_HOUR, WORK_START_HOUR, currentMood, formatGameTime, hungerLabel, isWorkingHours } from '../../lib/gameState';
import {
  ACHIEVEMENTS, CAREER_SKILL, DREAMS, DREAM_CHANGE_DAYS, canChangeDream, dreamById, eventOn, eventToday, missionTemplate, peopleHere, suggestions, wishTemplate,
  type LifeLink, type Suggestion,
} from '../../lib/life';
import { MAX_TRAITS, PERKS, PERK_LEVEL, SKILLS, TRAITS, perksOf, skillLevel, skillProgress, type DreamId, type Mission, type TraitId } from '../../lib/lifeState';
import { NEED_LABEL, TIRED_THRESHOLD, moodLabel, type NeedKey } from '../../lib/needs';
import { FRIENDSHIP_LEVELS, friendshipLevel, gameDay, HANGOUT_LEVEL } from '../../lib/people';
import { careerLadder, careerLevel, hoursToNextLevel, levelIndex } from '../../lib/progression';
import { equipmentById, equipmentPay } from '../../lib/equipment';
import { homeById } from '../../lib/homes';
import { homeComfort } from '../../lib/furniture';
import { districtById } from '../../lib/geography';
import { formatHome } from '../../lib/places';
import { genderLabel, heritageLabel } from '../../lib/identity';
import { assetUrl } from '../../lib/assetManifest';
import { itemById } from '../../lib/fashion';
import { Icon, type IconName } from './icons';
import { linkLabel } from './links';

export type OsTab = 'today' | 'goals' | 'skills' | 'people' | 'career' | 'money' | 'profile' | 'settings';

const TABS: readonly { id: OsTab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'goals', label: 'Goals', icon: 'goals' },
  { id: 'skills', label: 'Skills', icon: 'skills' },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'career', label: 'Career', icon: 'career' },
  { id: 'money', label: 'Money', icon: 'money' },
  { id: 'profile', label: 'Profile', icon: 'profile' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export interface LifeOSProps {
  state: GameState;
  character: Character;
  /** Where you are and what you're doing, in a few words. */
  whereabouts: { place: string; activity: string };
  tab: OsTab;
  onTab: (tab: OsTab) => void;
  /** Takes you to the place or interaction a goal or need needs. */
  onGo: (link: LifeLink) => void;
  onSetProfile: (bio: string, traits: TraitId[]) => void;
  onSetDream: (dream: DreamId) => void;
  onDismissWish: (id: string) => void;
  onSetSavingsGoal: (amount: number | null) => void;
  onOpenWardrobe: () => void;
  /** Opens the character creator to change appearance. */
  onEditLook: () => void;
  settings: {
    quality: string; onCycleQuality: () => void; showRoute: boolean; onShowRouteChange: (v: boolean) => void; sound: boolean; onSoundChange: (v: boolean) => void;
    /** Sleep until 07:00 where you are (your bed, a friend's, or rough). */
    onRest: () => void; restWhere: () => string;
    /** Back to the main menu (the game saves as you play). */
    onExitToMenu: () => void;
  };
  onClose: () => void;
}

const money = (n: number) => `${Math.round(n).toLocaleString()} GHAI`;

const NEED_ICON: Record<NeedKey | 'hunger', IconName> = { energy: 'energy', hygiene: 'hygiene', fun: 'fun', social: 'social', hunger: 'hunger' };

/** What each need does for you, and how to meet it. */
const NEED_INFO: Record<NeedKey | 'hunger', { effect: string; fix: LifeLink; fixHomeless?: LifeLink }> = {
  hunger: { effect: 'Below 20, work pays half.', fix: { to: 'homeUse', use: 'cook' }, fixHomeless: { to: 'food' } },
  energy: { effect: `Below ${TIRED_THRESHOLD}, work pays half. Sleep restores it.`, fix: { to: 'homeUse', use: 'sleep' }, fixHomeless: { to: 'homes' } },
  hygiene: { effect: 'Part of your mood. A shower fixes it.', fix: { to: 'homeUse', use: 'shower' }, fixHomeless: { to: 'homes' } },
  fun: { effect: 'Part of your mood. TV, books, runs, nights out.', fix: { to: 'homeUse', use: 'relax' }, fixHomeless: { to: 'park' } },
  social: { effect: 'Part of your mood. Time with people.', fix: { to: 'friend' } },
};

function Bar({ value, tone = 'accent', label }: { value: number; tone?: 'accent' | 'gold' | 'warn' | 'danger'; label: string }) {
  const color = { accent: 'bg-ui-accent', gold: 'bg-ui-gold', warn: 'bg-ui-warn', danger: 'bg-ui-danger' }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-ui-line/80" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
      <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-ui-line/70 bg-ui-raised/70 p-3.5 ${className}`}>{children}</div>;
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-baseline justify-between first:mt-0">
      <h3 className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">{children}</h3>
      {aside && <span className="text-[11px] text-ui-faint">{aside}</span>}
    </div>
  );
}

function GoButton({ link, onGo, small = false }: { link: LifeLink; onGo: (l: LifeLink) => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onGo(link)}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-ui-accent/60 bg-ui-accent/15 font-semibold text-ui-accent-strong transition hover:bg-ui-accent/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent ${small ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}`}
    >
      {linkLabel(link)} <Icon name="go" className="h-3 w-3" />
    </button>
  );
}

function Reward({ amount }: { amount: number }) {
  return <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-ui-gold-strong">+{amount.toLocaleString()} GHAI</span>;
}

function MissionRow({ m, onGo }: { m: Mission; onGo: (l: LifeLink) => void }) {
  const t = missionTemplate(m.template);
  if (!t) return null;
  const pct = (m.progress / m.target) * 100;
  const progress = t.metric === 'work' ? `${Math.floor(m.progress / 60)}h ${Math.round(m.progress % 60)}m / ${m.target / 60}h` : t.metric === 'earn' ? `${Math.round(m.progress)} / ${m.target}` : `${Math.floor(m.progress)} / ${m.target}`;
  return (
    <Card className={m.done ? 'border-ui-gold/40' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`m-0 text-sm font-semibold ${m.done ? 'text-ui-muted line-through decoration-ui-gold/60' : ''}`}>{t.title}</p>
          <p className="m-0 mt-0.5 text-[11px] text-ui-muted">{m.done ? 'Done · reward paid' : progress}</p>
        </div>
        {m.done ? <span className="flex items-center gap-1 text-xs font-semibold text-ui-gold-strong"><Icon name="check" /> {m.reward}</span> : <Reward amount={m.reward} />}
      </div>
      {!m.done && (
        <div className="mt-2.5 flex items-center gap-3">
          <div className="flex-1"><Bar value={pct} label={t.title} /></div>
          <GoButton link={t.link} onGo={onGo} small />
        </div>
      )}
    </Card>
  );
}

/** The character's personal operating system: needs, goals, skills, people, career, money, profile and settings. */
export function LifeOS(props: LifeOSProps) {
  const { state, character, tab, onTab, onClose } = props;
  const mood = currentMood(state);
  const home = homeById(state.home);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [tab]);
  useEffect(() => {
    // Escape closes the topmost panel only: a shop or menu open over the Life OS goes first
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role=dialog]')) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside
      aria-label="Life OS"
      className="os-glass os-rise pointer-events-auto fixed inset-x-0 bottom-0 z-40 flex max-h-[82vh] flex-col overflow-hidden rounded-t-3xl border border-ui-line/70 text-ui-ink sm:inset-x-auto sm:bottom-4 sm:left-4 sm:top-24 sm:max-h-none sm:w-[26rem] sm:rounded-3xl"
    >
      {/* Who you are, how you feel, where you are */}
      <header className="relative border-b border-ui-line/60 px-4 pb-3 pt-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ui-accent/10 to-transparent" aria-hidden />
        <div className="relative flex items-center gap-3">
          <img src={assetUrl(`models/characters/rocketbox/thumbs/${character.lookId}.webp`)} alt="" className="h-14 w-14 shrink-0 rounded-2xl border border-ui-gold/40 object-cover shadow-lg" />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate font-display text-lg font-bold leading-tight">{character.name}</p>
            <p className="m-0 truncate text-xs text-ui-muted">
              {careerLevel(character.career, state.workMinutes).title} · <span className="capitalize">{character.lifestyle.replace('-', ' ')}</span>
            </p>
            <p className="m-0 mt-0.5 truncate text-[11px] text-ui-faint">{props.whereabouts.place} · {props.whereabouts.activity}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Life OS" className="self-start rounded-full p-1.5 text-ui-muted hover:bg-ui-line/50 hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">
            <Icon name="close" />
          </button>
        </div>
        <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-ui-panel/70 px-2 py-1.5">
            <p className="m-0 text-[10px] uppercase tracking-[0.14em] text-ui-faint">Mood</p>
            <p className={`m-0 text-sm font-semibold ${mood < 25 ? 'text-ui-danger' : mood >= 65 ? 'text-ui-accent-strong' : ''}`}>{moodLabel(mood)}</p>
          </div>
          <div className="rounded-xl bg-ui-panel/70 px-2 py-1.5">
            <p className="m-0 text-[10px] uppercase tracking-[0.14em] text-ui-faint">GHAI</p>
            <p className="m-0 text-sm font-semibold tabular-nums text-ui-gold-strong">{state.balance.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-ui-panel/70 px-2 py-1.5">
            <p className="m-0 text-[10px] uppercase tracking-[0.14em] text-ui-faint">{formatGameTime(state.time)}</p>
            <p className="m-0 truncate text-sm font-semibold">{home ? 'Housed' : 'No home'}</p>
          </div>
        </div>
      </header>

      <nav className="grid grid-cols-8 gap-0.5 border-b border-ui-line/60 px-1.5 py-1.5" role="tablist" aria-label="Life OS sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.04em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent ${tab === t.id ? 'bg-ui-accent/15 text-ui-accent-strong' : 'text-ui-faint hover:text-ui-ink'}`}
          >
            <Icon name={t.icon} className="h-[18px] w-[18px]" />
            {t.label}
          </button>
        ))}
      </nav>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-3" role="tabpanel">
        {tab === 'today' && <Today {...props} />}
        {tab === 'goals' && <Goals {...props} />}
        {tab === 'skills' && <Skills {...props} />}
        {tab === 'people' && <People {...props} />}
        {tab === 'career' && <CareerTab {...props} />}
        {tab === 'money' && <Money {...props} />}
        {tab === 'profile' && <Profile {...props} />}
        {tab === 'settings' && <Settings {...props} />}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------- Today

function Today({ state, character, onGo, onDismissWish, settings }: LifeOSProps) {
  const tips: Suggestion[] = suggestions(state, character.career);
  const needs: { key: NeedKey | 'hunger'; value: number; label: string }[] = [
    { key: 'hunger', value: state.fullness, label: `Hunger · ${hungerLabel(state.fullness)}` },
    ...(['energy', 'hygiene', 'fun', 'social'] as NeedKey[]).map((k) => ({ key: k, value: state.needs[k], label: NEED_LABEL[k] })),
  ];
  const ctx = { career: character.career, state };
  return (
    <>
      {tips.length > 0 && (
        <>
          <SectionTitle>Right now</SectionTitle>
          <div className="space-y-2">
            {tips.slice(0, 3).map((t) => (
              <Card key={t.text} className={t.urgent ? 'border-ui-danger/50 bg-ui-danger/10' : ''}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold">{t.text}</p>
                    <p className={`m-0 text-[11px] ${t.urgent ? 'text-ui-danger' : 'text-ui-muted'}`}>{t.why}</p>
                  </div>
                  <GoButton link={t.link} onGo={onGo} small />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <TodayEvent state={state} onGo={onGo} />

      <SectionTitle aside="Tap a need to look after it">Needs</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {needs.map((n) => {
          const info = NEED_INFO[n.key];
          const link = !state.home && info.fixHomeless ? info.fixHomeless : info.fix;
          const tone = n.value < 20 ? 'danger' : n.value < 45 ? 'warn' : 'accent';
          return (
            <button
              key={n.key}
              type="button"
              onClick={() => onGo(link)}
              title={`${info.effect} ${linkLabel(link)}.`}
              className="group rounded-2xl border border-ui-line/70 bg-ui-raised/70 p-3 text-left transition hover:border-ui-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
            >
              <span className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold"><Icon name={NEED_ICON[n.key]} className="h-3.5 w-3.5 text-ui-accent-strong" />{n.label}</span>
                <span className="tabular-nums text-ui-muted">{Math.round(n.value)}</span>
              </span>
              <span className="mt-2 block"><Bar value={n.value} tone={tone} label={n.label} /></span>
              <span className="mt-1.5 block text-[10px] text-ui-faint group-hover:text-ui-accent-strong">{linkLabel(link)} →</span>
            </button>
          );
        })}
      </div>
      <Card className="mt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold">Sleep until 07:00</p>
            <p className="m-0 text-[11px] text-ui-muted">{settings.restWhere()}</p>
          </div>
          <button type="button" onClick={settings.onRest} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ui-accent/60 bg-ui-accent/15 px-3 py-1.5 text-xs font-semibold text-ui-accent-strong hover:bg-ui-accent/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">
            <Icon name="energy" className="h-3 w-3" /> Sleep
          </button>
        </div>
      </Card>

      <SectionTitle aside="New missions each game day">Daily missions</SectionTitle>
      <div className="space-y-2">
        {state.life.daily.length === 0 && <p className="m-0 text-xs text-ui-muted">Your missions arrive with the next minute of play.</p>}
        {state.life.daily.map((m) => <MissionRow key={m.id} m={m} onGo={onGo} />)}
      </div>

      <SectionTitle aside="Optional, from how you're doing">Wishes</SectionTitle>
      <div className="space-y-2">
        {state.life.wishes.length === 0 && <p className="m-0 text-xs text-ui-muted">No wishes right now. New ones come as your life changes (at most one an hour).</p>}
        {state.life.wishes.map((w) => {
          const t = wishTemplate(w.template);
          if (!t) return null;
          const live = t.metric === 'balance' ? state.balance : t.metric === 'home' ? (state.home ? 1 : 0) : w.progress;
          return (
            <Card key={w.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="m-0 text-sm font-semibold"><Icon name="spark" className="mr-1 inline h-3 w-3 text-ui-gold" />{t.title(ctx, w)}</p>
                <Reward amount={w.reward} />
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1"><Bar value={(live / w.target) * 100} tone="gold" label={t.title(ctx, w)} /></div>
                <button type="button" onClick={() => onDismissWish(w.id)} className="rounded-full px-2 py-1 text-[11px] text-ui-faint hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Not now</button>
                <GoButton link={t.link} onGo={onGo} small />
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

/** Today's optional city event, if there is one: what it is, when, the bonus for joining in, and a way there. */
function TodayEvent({ state, onGo }: { state: GameState; onGo: (l: LifeLink) => void }) {
  const day = gameDay(state.time.totalMinutes);
  const e = eventToday(state.districtId, day);
  if (!e) return null;
  const on = eventOn(e, state.time.hour);
  const over = state.time.hour >= e.to;
  const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;
  return (
    <>
      <SectionTitle aside={on ? 'On now' : over ? 'Finished for today' : `From ${hh(e.from)}`}>Happening today</SectionTitle>
      <Card className={on ? 'border-ui-accent/60 bg-ui-accent/10' : ''}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold">{e.title(districtById(state.districtId))}</p>
            <p className="m-0 text-[11px] text-ui-muted">{hh(e.from)}–{hh(e.to)} · {e.perk}</p>
          </div>
          {!over && <GoButton link={e.link} onGo={onGo} small />}
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- Goals

function Goals({ state, character, onGo, onSetDream }: LifeOSProps) {
  const today = gameDay(state.time.totalMinutes);
  const dream = dreamById(state.life.dream?.id);
  const [choosing, setChoosing] = useState(false);
  const ctx = { career: character.career, state };
  const canChange = canChangeDream(state.life, today);
  const earned = new Map(state.life.achievements.map((x) => [x.id, x.t]));
  return (
    <>
      <SectionTitle aside={dream && !canChange ? `Can change in ${DREAM_CHANGE_DAYS - (today - state.life.dream!.since)} days` : undefined}>Your dream</SectionTitle>
      {dream && !choosing ? (
        <Card className="border-ui-gold/40 bg-gradient-to-br from-ui-gold/10 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 font-display text-base font-bold text-ui-gold-strong">{dream.title}</p>
              <p className="m-0 text-xs text-ui-muted">{dream.description}</p>
            </div>
            {canChange && <button type="button" onClick={() => setChoosing(true)} className="rounded-full border border-ui-line px-2.5 py-1 text-[11px] hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Change</button>}
          </div>
          <ol className="m-0 mt-3 list-none space-y-2.5 p-0">
            {dream.stages.map((stage, i) => {
              const [now, need] = stage.check(ctx);
              const done = state.life.dreamStages.includes(`${dream.id}:${i}`);
              const current = !done && dream.stages.slice(0, i).every((_, k) => state.life.dreamStages.includes(`${dream.id}:${k}`));
              return (
                <li key={i} className={`flex items-start gap-2.5 ${!done && !current ? 'opacity-55' : ''}`}>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${done ? 'border-ui-gold bg-ui-gold text-black' : current ? 'border-ui-gold text-ui-gold-strong' : 'border-ui-line text-ui-faint'}`}>
                    {done ? <Icon name="check" className="h-3 w-3" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="m-0 text-sm">{stage.title}</p>
                      <Reward amount={stage.reward} />
                    </div>
                    {current && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1"><Bar value={(now / need) * 100} tone="gold" label={stage.title} /></div>
                        <span className="text-[11px] tabular-nums text-ui-muted">{Math.min(now, need).toLocaleString()} / {need.toLocaleString()}</span>
                        <GoButton link={stage.link} onGo={onGo} small />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="m-0 text-xs text-ui-muted">Pick a long-term dream. Each has five milestones with GHAI rewards; finish it for a permanent mood perk. You can change it once a game week.</p>
          {DREAMS.filter((d) => !d.open || d.open(ctx)).map((d) => (
            <button key={d.id} type="button" onClick={() => { onSetDream(d.id); setChoosing(false); }} disabled={d.id === state.life.dream?.id}
              className="w-full rounded-2xl border border-ui-line/70 bg-ui-raised/70 p-3 text-left transition hover:border-ui-gold/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:opacity-50">
              <p className="m-0 text-sm font-semibold">{d.title}</p>
              <p className="m-0 text-[11px] text-ui-muted">{d.description} · up to {d.stages.reduce((s, x) => s + x.reward, 0).toLocaleString()} GHAI</p>
            </button>
          ))}
          {choosing && <button type="button" onClick={() => setChoosing(false)} className="text-xs text-ui-muted hover:text-ui-ink">Keep my current dream</button>}
        </div>
      )}

      <SectionTitle aside="New each game week">Weekly challenges</SectionTitle>
      <div className="space-y-2">{state.life.weekly.map((m) => <MissionRow key={m.id} m={m} onGo={onGo} />)}</div>

      <SectionTitle aside={`${state.life.achievements.filter((x) => ACHIEVEMENTS.some((a) => a.id === x.id)).length} / ${ACHIEVEMENTS.length}`}>Achievements</SectionTitle>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
        {ACHIEVEMENTS.map((a) => {
          const t = earned.get(a.id);
          return (
            <li key={a.id} className={`rounded-2xl border p-2.5 ${t !== undefined ? 'border-ui-gold/50 bg-ui-gold/10' : 'border-ui-line/60 bg-ui-raised/40'}`}>
              <p className="m-0 flex items-center gap-1 text-xs font-semibold">
                <Icon name={t !== undefined ? 'skills' : 'lock'} className={`h-3.5 w-3.5 ${t !== undefined ? 'text-ui-gold-strong' : 'text-ui-faint'}`} />
                {a.title}
              </p>
              <p className="m-0 mt-0.5 text-[10px] text-ui-muted">{a.description}</p>
              <p className="m-0 mt-1 text-[10px] text-ui-faint">{t !== undefined ? `Earned day ${gameDay(t) + 1}` : `+${a.reward.toLocaleString()} GHAI`}</p>
              {a.unlock && <p className="m-0 mt-0.5 text-[10px] text-ui-gold-strong">{t !== undefined ? 'Unlocked' : 'Unlocks'}: {itemById(a.unlock)?.name}</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------- Skills

function Skills({ state }: LifeOSProps) {
  const perks = perksOf(state.life);
  return (
    <>
      <SectionTitle aside={`Perk at level ${PERK_LEVEL}`}>Skills</SectionTitle>
      <div className="space-y-2">
        {SKILLS.map((s) => {
          const xp = state.life.skills[s.id];
          const lvl = skillLevel(xp);
          return (
            <Card key={s.id}>
              <div className="flex items-baseline justify-between">
                <p className="m-0 text-sm font-semibold">{s.label}</p>
                <span className="text-xs font-semibold tabular-nums text-ui-accent-strong">Level {lvl}</span>
              </div>
              <div className="mt-2"><Bar value={skillProgress(xp) * 100} label={`${s.label} progress`} /></div>
              <p className="m-0 mt-1.5 text-[11px] text-ui-muted">{s.how}</p>
            </Card>
          );
        })}
      </div>
      <SectionTitle aside={`${perks.length} unlocked`}>Perks</SectionTitle>
      <ul className="m-0 grid list-none gap-2 p-0">
        {PERKS.map((p) => {
          const on = perks.includes(p.id);
          return (
            <li key={p.id} className={`flex items-start gap-2.5 rounded-2xl border p-3 ${on ? 'border-ui-accent/50 bg-ui-accent/10' : 'border-ui-line/60 bg-ui-raised/40'}`}>
              <Icon name={on ? 'check' : 'lock'} className={`mt-0.5 h-4 w-4 shrink-0 ${on ? 'text-ui-accent-strong' : 'text-ui-faint'}`} />
              <div>
                <p className="m-0 text-sm font-semibold">{p.label}</p>
                <p className="m-0 text-[11px] text-ui-muted">{p.effect}</p>
                {!on && <p className="m-0 mt-0.5 text-[10px] text-ui-faint">{p.skill ? `Unlocks at ${SKILLS.find((s) => s.id === p.skill)!.label} level ${PERK_LEVEL}` : 'Unlocks when you achieve your dream'}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------- People

function People({ state, onGo }: LifeOSProps) {
  const people = peopleHere(state);
  const today = gameDay(state.time.totalMinutes);
  const city = districtById(state.districtId).city.name;
  return (
    <>
      <SectionTitle aside={city}>People you can meet here</SectionTitle>
      <p className="m-0 mb-2 text-[11px] text-ui-muted">Everyone here is a computer-controlled resident, never another player. Playing with other people needs online accounts, which aren&rsquo;t available yet.</p>
      <div className="space-y-2">
        {people.map(({ resident, rel }) => {
          const level = friendshipLevel(rel.points);
          const next = FRIENDSHIP_LEVELS[level + 1];
          const seenToday = rel.lastDay === today;
          return (
            <Card key={resident.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <img src={assetUrl(`models/characters/rocketbox/thumbs/${resident.lookId}.webp`)} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-semibold">{resident.name}</p>
                    <p className="m-0 truncate text-[11px] text-ui-muted">{resident.role} · <span className="text-ui-accent-strong">{FRIENDSHIP_LEVELS[level].name}</span></p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-ui-line px-2 py-0.5 text-[10px] text-ui-faint">Computer-controlled</span>
              </div>
              {(() => {
                const past = state.life.history.filter((h) => h.who === resident.id).slice(-3).reverse();
                return past.length > 0 && (
                  <p className="m-0 mt-2 text-[10px] text-ui-faint">Recently: {past.map((h) => `${h.what} (day ${gameDay(h.t) + 1})`).join(' · ')}</p>
                );
              })()}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1"><Bar value={rel.points} label={`Friendship with ${resident.name}`} /></div>
                <span className="text-[10px] text-ui-faint">{next ? `${next.points - rel.points} to ${next.name.toLowerCase()}` : 'Best friends'}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="m-0 text-[11px] text-ui-muted">{seenToday ? 'You\'ve spent time together today.' : level >= HANGOUT_LEVEL ? 'Free to hang out today.' : rel.points ? 'Say hello and chat.' : 'You haven\'t met yet.'}</p>
                <GoButton link={{ to: 'friend', residentId: resident.id }} onGo={onGo} small />
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Career

function CareerTab({ state, character, onGo }: LifeOSProps) {
  const career = character.career;
  if (career === 'none') {
    return <Card><p className="m-0 text-sm">You chose a life without a career, so there&rsquo;s no workplace or wage. You live on your savings.</p></Card>;
  }
  const ladder = careerLadder(career);
  const idx = levelIndex(career, state.workMinutes);
  const left = hoursToNextLevel(career, state.workMinutes);
  const pay = Math.round(HOURLY_WAGE[career] * ladder[idx].pay * equipmentPay(state.equipment, career));
  const skill = SKILLS.find((s) => s.id === CAREER_SKILL[career])!;
  const next = ladder[idx + 1];
  const progress = next ? ((state.workMinutes - ladder[idx].hours * 60) / ((next.hours - ladder[idx].hours) * 60)) * 100 : 100;
  return (
    <>
      <Card className="border-ui-accent/40">
        <p className="m-0 text-[11px] uppercase tracking-[0.14em] text-ui-faint">Current job</p>
        <p className="m-0 font-display text-lg font-bold">{ladder[idx].title}</p>
        <dl className="m-0 mt-2 grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-ui-muted">Pay</dt><dd className="m-0 text-right tabular-nums">{money(pay)} an hour</dd>
          <dt className="text-ui-muted">Hours</dt><dd className="m-0 text-right">{String(WORK_START_HOUR).padStart(2, '0')}:00–{WORK_END_HOUR}:00 · {isWorkingHours(state.time) ? 'on now' : 'off now'}</dd>
          <dt className="text-ui-muted">Worked today</dt><dd className="m-0 text-right tabular-nums">{Math.floor(state.today.minutesWorked / 60)}h {state.today.minutesWorked % 60}m</dd>
          <dt className="text-ui-muted">Career skill</dt><dd className="m-0 text-right">{skill.label} level {skillLevel(state.life.skills[skill.id])}</dd>
        </dl>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-ui-muted"><span>Promotion</span><span>{left === null || !next ? 'Top of the ladder' : `${next.title} in ${left}h`}</span></div>
          <Bar value={progress} tone="gold" label="Promotion progress" />
        </div>
        <div className="mt-3 flex justify-end"><GoButton link={{ to: 'work' }} onGo={onGo} /></div>
      </Card>
      <SectionTitle>Ladder</SectionTitle>
      <ol className="m-0 list-none space-y-1.5 p-0">
        {ladder.map((l, i) => (
          <li key={l.title} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${i === idx ? 'bg-ui-accent/15 text-ui-accent-strong' : i < idx ? 'text-ui-muted' : 'text-ui-faint'}`}>
            <span>{i < idx ? '✓ ' : ''}{l.title}</span>
            <span className="text-[11px] tabular-nums">{Math.round(HOURLY_WAGE[career] * l.pay)} GHAI/h · from {l.hours}h</span>
          </li>
        ))}
      </ol>
      <p className="m-0 mt-3 text-[11px] text-ui-muted">Every working hour at your workplace also offers one task: a real decision scored from data. Excellent calls pay a bonus (scaled by mood) and count towards promotion. Studying at a desk at home counts too.</p>
    </>
  );
}

// ---------------------------------------------------------------- Money

function Money({ state, character, onSetSavingsGoal }: LifeOSProps) {
  const home = homeById(state.home);
  const [goal, setGoal] = useState(state.life.savingsGoal ? String(state.life.savingsGoal) : '');
  const history = [...state.life.ledger].reverse();
  const goalPct = state.life.savingsGoal ? (state.balance / state.life.savingsGoal) * 100 : 0;
  return (
    <>
      <Card className="border-ui-gold/40 bg-gradient-to-br from-ui-gold/10 to-transparent">
        <p className="m-0 text-[11px] uppercase tracking-[0.14em] text-ui-faint">Wallet</p>
        <p className="m-0 font-display text-2xl font-bold tabular-nums text-ui-gold-strong">{money(state.balance)}</p>
        <dl className="m-0 mt-2 grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-ui-muted">In today</dt><dd className="m-0 text-right tabular-nums text-ui-accent-strong">+{state.today.income.toLocaleString()}</dd>
          <dt className="text-ui-muted">Out today</dt><dd className="m-0 text-right tabular-nums text-ui-danger">−{state.today.expenses.toLocaleString()}</dd>
          <dt className="text-ui-muted">Living costs</dt><dd className="m-0 text-right tabular-nums">{HOURLY_LIVING_COST[character.lifestyle]} an hour{state.life.profile.traits.includes('thrifty') ? ' (−10% thrifty)' : ''}</dd>
          <dt className="text-ui-muted">Rent</dt><dd className="m-0 text-right tabular-nums">{home ? `${home.rentPerNight.toLocaleString()} a night` : 'None'}</dd>
        </dl>
        <p className="m-0 mt-2 text-[10px] text-ui-faint">GHAI is AYE&rsquo;s virtual currency. It has no cash value and can&rsquo;t be withdrawn.</p>
      </Card>

      <SectionTitle>Savings goal</SectionTitle>
      <Card>
        {state.life.savingsGoal ? (
          <>
            <div className="mb-1.5 flex justify-between text-xs"><span>{money(state.balance)} of {money(state.life.savingsGoal)}</span><span className="text-ui-muted">{Math.min(100, Math.round(goalPct))}%</span></div>
            <Bar value={goalPct} tone="gold" label="Savings goal" />
          </>
        ) : <p className="m-0 text-xs text-ui-muted">Set a target to track what you&rsquo;re saving for.</p>}
        <form className="mt-2.5 flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(goal.replace(/[^0-9]/g, '')); onSetSavingsGoal(n > 0 ? n : null); }}>
          <label className="sr-only" htmlFor="os-goal">Savings goal in GHAI</label>
          <input id="os-goal" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. 50000"
            className="min-w-0 flex-1 rounded-lg border border-ui-line bg-ui-panel px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent" />
          <button type="submit" className="rounded-lg border border-ui-accent/60 bg-ui-accent/15 px-3 text-xs font-semibold text-ui-accent-strong hover:bg-ui-accent/25">Set</button>
          {state.life.savingsGoal && <button type="button" onClick={() => { setGoal(''); onSetSavingsGoal(null); }} className="px-1 text-xs text-ui-faint hover:text-ui-ink">Clear</button>}
        </form>
      </Card>

      <SectionTitle aside="Most recent first">History</SectionTitle>
      {history.length === 0 && <p className="m-0 text-xs text-ui-muted">Nothing yet. Money in and out appears here as you play.</p>}
      <ul className="m-0 list-none divide-y divide-ui-line/50 p-0">
        {history.map((e, i) => (
          <li key={`${e.t}-${i}`} className="flex items-center justify-between gap-3 py-1.5 text-xs">
            <span className="min-w-0 truncate">{e.label}<span className="ml-2 text-[10px] text-ui-faint">day {gameDay(e.t) + 1}</span></span>
            <span className={`shrink-0 tabular-nums ${e.amount >= 0 ? 'text-ui-accent-strong' : 'text-ui-muted'}`}>{e.amount >= 0 ? '+' : '−'}{Math.abs(Math.round(e.amount)).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------- Profile

function Profile({ state, character, onSetProfile, onOpenWardrobe, onEditLook, onGo }: LifeOSProps) {
  const [bio, setBio] = useState(state.life.profile.bio);
  const [traits, setTraits] = useState<TraitId[]>(state.life.profile.traits);
  const dirty = bio !== state.life.profile.bio || traits.join() !== state.life.profile.traits.join();
  const home = homeById(state.home);
  const gadgets = useMemo(() => state.equipment.map((id) => equipmentById(id)?.name).filter(Boolean), [state.equipment]);
  const toggle = (t: TraitId) => setTraits((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length < MAX_TRAITS ? [...cur, t] : cur));
  return (
    <>
      <SectionTitle>About you</SectionTitle>
      <Card>
        <label htmlFor="os-bio" className="text-[11px] text-ui-muted">Bio</label>
        <textarea id="os-bio" value={bio} maxLength={280} rows={3} onChange={(e) => setBio(e.target.value)} placeholder="A line or two about who you are and what you want."
          className="mt-1 w-full resize-none rounded-lg border border-ui-line bg-ui-panel px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent" />
        <p className="m-0 mt-2 text-[11px] text-ui-muted">Personality: choose up to {MAX_TRAITS}. Each one changes how your life plays.</p>
        <div className="mt-2 space-y-1.5">
          {TRAITS.map((t) => {
            const on = traits.includes(t.id);
            return (
              <button key={t.id} type="button" aria-pressed={on} onClick={() => toggle(t.id)} disabled={!on && traits.length >= MAX_TRAITS}
                className={`w-full rounded-xl border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:opacity-40 ${on ? 'border-ui-accent/60 bg-ui-accent/15' : 'border-ui-line/70 hover:border-ui-accent/50'}`}>
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="block text-[11px] text-ui-muted">{t.effect}</span>
              </button>
            );
          })}
        </div>
        <button type="button" disabled={!dirty} onClick={() => onSetProfile(bio, traits)}
          className="mt-3 w-full rounded-xl bg-ui-accent py-2 text-sm font-semibold text-black transition hover:bg-ui-accent-strong disabled:cursor-not-allowed disabled:opacity-40">
          {dirty ? 'Save profile' : 'Saved'}
        </button>
      </Card>

      <SectionTitle>Details</SectionTitle>
      <Card>
        <dl className="m-0 grid grid-cols-[6.5rem_1fr] gap-y-1 text-xs">
          <dt className="text-ui-muted">From</dt><dd className="m-0">{formatHome(character.country, character.region)}</dd>
          <dt className="text-ui-muted">Gender</dt><dd className="m-0">{genderLabel(character.gender)}</dd>
          <dt className="text-ui-muted">Heritage</dt><dd className="m-0">{[heritageLabel(character.heritage), character.ethnicGroup].filter(Boolean).join(' · ')}</dd>
          <dt className="text-ui-muted">Height</dt><dd className="m-0">{character.heightCm} cm</dd>
          <dt className="text-ui-muted">Days lived</dt><dd className="m-0">{gameDay(state.time.totalMinutes) + 1}</dd>
        </dl>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[11px] text-ui-muted">Change your body, skin, hair colour and clothes; buy new pieces at the boutique.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEditLook} className="rounded-full border border-ui-gold/60 px-3 py-1.5 text-xs text-ui-gold-strong hover:bg-ui-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Change appearance</button>
            <button type="button" onClick={onOpenWardrobe} className="rounded-full border border-ui-line px-3 py-1.5 text-xs hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Wardrobe</button>
            <GoButton link={{ to: 'fashion' }} onGo={onGo} small />
          </div>
        </div>
      </Card>

      <SectionTitle>What you own</SectionTitle>
      <Card>
        <dl className="m-0 grid grid-cols-[6.5rem_1fr] gap-y-1.5 text-xs">
          <dt className="text-ui-muted">Home</dt><dd className="m-0">{home ? `${home.name} (rented) · comfort ${homeComfort(state.furniture)}` : 'None'}</dd>
          <dt className="text-ui-muted">Furniture</dt><dd className="m-0">{state.furniture.length ? `${state.furniture.length} pieces (${state.furniture.filter((o) => !o.at).length} in storage)` : 'Only what your home came with'}</dd>
          <dt className="text-ui-muted">Clothes</dt><dd className="m-0">{character.wardrobe.owned.length} items</dd>
          <dt className="text-ui-muted">Gadgets</dt><dd className="m-0">{gadgets.length ? gadgets.join(', ') : 'None'}</dd>
          <dt className="text-ui-muted">Vehicles</dt><dd className="m-0 text-ui-faint">Not available yet: car dealerships aren&rsquo;t built.</dd>
        </dl>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- Settings

function Settings({ settings }: LifeOSProps) {
  return (
    <>
      <SectionTitle>Game</SectionTitle>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold">Main menu</p>
            <p className="m-0 text-[11px] text-ui-muted">Your life saves as you play, so nothing is lost.</p>
          </div>
          <button type="button" onClick={settings.onExitToMenu} className="rounded-full border border-ui-line px-3 py-1.5 text-xs hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Main menu</button>
        </div>
      </Card>
      <SectionTitle>Graphics</SectionTitle>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold">Quality</p>
            <p className="m-0 text-[11px] text-ui-muted">Auto lowers detail if the frame rate drops.</p>
          </div>
          <button type="button" onClick={settings.onCycleQuality} className="rounded-full border border-ui-line px-3 py-1.5 text-xs capitalize hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">{settings.quality}</button>
        </div>
      </Card>
      <SectionTitle>Sound</SectionTitle>
      <Card>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold">Game sounds</span>
            <span className="block text-[11px] text-ui-muted">Your car&rsquo;s engine while you drive. There&rsquo;s no music yet.</span>
          </span>
          <input type="checkbox" checked={settings.sound} onChange={(e) => settings.onSoundChange(e.target.checked)} className="h-4 w-4 accent-[var(--color-ui-accent)]" />
        </label>
      </Card>
      <SectionTitle>Controls</SectionTitle>
      <Card>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold">Show the route</span>
            <span className="block text-[11px] text-ui-muted">Dots on the ground when you walk somewhere.</span>
          </span>
          <input type="checkbox" checked={settings.showRoute} onChange={(e) => settings.onShowRouteChange(e.target.checked)} className="h-4 w-4 accent-[var(--color-ui-accent)]" />
        </label>
        <dl className="m-0 mt-3 grid grid-cols-[7rem_1fr] gap-y-1 text-[11px]">
          <dt className="text-ui-muted">Move</dt><dd className="m-0">Click or tap the ground, W A S D, or the touch stick</dd>
          <dt className="text-ui-muted">Interact</dt><dd className="m-0">E, or tap the prompt</dd>
          <dt className="text-ui-muted">Life OS</dt><dd className="m-0">L opens and closes it; Esc closes</dd>
          <dt className="text-ui-muted">Map</dt><dd className="m-0">M (once you own a phone)</dd>
        </dl>
      </Card>
      <SectionTitle>Accessibility</SectionTitle>
      <Card><p className="m-0 text-xs text-ui-muted">AYE follows your device&rsquo;s reduced-motion setting: animations and transitions switch off when it&rsquo;s on. Every panel works with the keyboard.</p></Card>
      <SectionTitle>Account and privacy</SectionTitle>
      <Card><p className="m-0 text-xs text-ui-muted">Your life is saved in this browser only. Online accounts, cloud saves and playing with other people aren&rsquo;t available yet, so there are no privacy settings to change: nothing leaves this device.</p></Card>
    </>
  );
}
