import { useEffect, useState, type ComponentType } from 'react';
import {
  ArrowLeft, BedDouble, BookOpen, Briefcase, Check, Coins, Compass, Dumbbell, Footprints, Home, Martini, MessageCircle,
  ShoppingBag, Smile, Sofa, Sparkles, Star, Users, UtensilsCrossed, Wallet, Bath, ChefHat, Trees, Trophy,
} from 'lucide-react';
import type { Character } from './CharacterCreation';
import type { GameState } from '../lib/gameState';
import { DREAMS, dreamById, missionTemplate, wishTemplate, type LifeLink, type MissionTemplate } from '../lib/life';
import type { DreamId, Mission } from '../lib/lifeState';

type Tab = 'daily' | 'weekly' | 'story';
type IconType = ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;

/** Each kind of quest gets a picture, as in the design. */
const METRIC_ICON: Record<string, IconType> = {
  work: Briefcase, goodTask: Star, earn: Wallet, eatOut: UtensilsCrossed, meal: UtensilsCrossed, cook: ChefHat, wash: Bath,
  relax: Sofa, social: Users, meetNew: MessageCircle, newPlace: Compass, run: Dumbbell, xp: Sparkles, study: BookOpen,
  buyFurniture: Sofa, nightOut: Martini, shop: ShoppingBag, park: Trees, lounge: Martini, balance: Coins, home: Home, friendship: Users,
};
const LINK_ICON: Partial<Record<LifeLink['to'], IconType>> = { work: Briefcase, food: UtensilsCrossed, fashion: ShoppingBag, park: Trees, nightlife: Martini, home: Home, homes: Home, explore: Compass, friend: Users, homeUse: BedDouble, travel: Footprints };

/** How the game says what a quest is, beyond its title. */
const METRIC_DETAIL: Record<string, string> = {
  work: 'Spend the time at your workplace during working hours.',
  goodTask: 'Take on a task at work and choose well.',
  earn: 'Wages, tips and rewards all count.',
  eatOut: 'Buy a meal at any food spot or restaurant.',
  meal: 'A meal out or one cooked at home.',
  cook: 'Use the cooker or kitchen in your home.',
  wash: 'A shower or a bath at home.',
  relax: 'Watch TV, read, listen to music or play games at home.',
  social: 'Chat, hang out or go out with someone.',
  meetNew: 'Introduce yourself to someone you haven’t met.',
  newPlace: 'Walk to a place in the city you haven’t been to before.',
  run: 'Go for a run in the park.',
  xp: 'Everything you practise builds experience.',
  study: 'Study at a desk at home or on campus.',
  buyFurniture: 'Buy a piece for your home from the catalogue.',
  nightOut: 'Go out to the lounge with a friend.',
  shop: 'Buy something at the boutique.',
  park: 'Sit on a bench in the park and let time pass.',
  lounge: 'Find the city’s live-music lounge.',
};

const fmt = (n: number) => Math.round(n).toLocaleString();

interface QuestView {
  key: string;
  title: string;
  detail: string;
  progress: number;
  target: number;
  reward: number;
  done: boolean;
  icon: IconType;
  link: LifeLink;
  /** What else completing it gives. */
  extras: string[];
}

function fromMission(m: Mission, kind: 'Daily' | 'Weekly'): QuestView {
  const t: MissionTemplate | undefined = missionTemplate(m.template);
  return {
    key: m.id,
    title: t?.title ?? m.template,
    detail: `${METRIC_DETAIL[t?.metric ?? ''] ?? ''} ${kind === 'Daily' ? 'New quests every game day.' : 'New quests every game week.'}`.trim(),
    progress: Math.min(m.progress, m.target),
    target: m.target,
    reward: m.reward,
    done: m.done,
    icon: METRIC_ICON[t?.metric ?? ''] ?? Star,
    link: t?.link ?? { to: 'explore' },
    extras: ['A lift in mood', 'Counts towards Go-getter and Unstoppable'],
  };
}

function ProgressBar({ value, max, done }: { value: number; max: number; done: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#2a2620]" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={`h-full rounded-full ${done ? 'bg-ui-success' : 'bg-gradient-to-r from-[#c88a2c] to-[#f0c67e]'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** The ring on the right of each quest: how far along it is, and what it pays. */
function RewardRing({ value, max, reward, done }: { value: number; max: number; reward: number; done: boolean }) {
  if (done) return <span className="grid h-9 w-9 place-items-center rounded-full bg-ui-success text-black"><Check size={20} aria-hidden={true} /></span>;
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const r = 15, c = 2 * Math.PI * r;
  return (
    <span className="flex flex-col items-center gap-0.5">
      <svg viewBox="0 0 36 36" className="h-8 w-8" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="#d79d3c" opacity="0.18" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e8b452" strokeWidth="4" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 18 18)" strokeLinecap="round" />
        <circle cx="18" cy="18" r="7" fill="#e8b452" />
      </svg>
      <span className="text-[10px] font-semibold tabular-nums text-ui-gold-strong">+{fmt(reward)}</span>
    </span>
  );
}

const PILL = 'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold';

/**
 * Quests, as the AYE design shows them: Daily, Weekly and Story tabs, each
 * quest with its picture, progress and reward; tap one for its details. They
 * are the game's real missions and your dream's milestones, and they complete
 * themselves when you do them in the city, so there's nothing to tick off by hand.
 */
export function QuestsScreen({ state, character, onGo, onSetDream, onClose }: {
  state: GameState;
  character: Character;
  onGo: (link: LifeLink) => void;
  onSetDream: (id: DreamId) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('daily');
  const [open, setOpen] = useState<QuestView | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (open) setOpen(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const dream = dreamById(state.life.dream?.id);
  const ctx = { career: character.career, state };
  const story: QuestView[] = dream
    ? dream.stages.map((stage, i) => {
      const [now, need] = stage.check(ctx);
      const done = state.life.dreamStages.includes(`${dream.id}:${i}`);
      return {
        key: `${dream.id}:${i}`, title: stage.title, detail: `Chapter ${i + 1} of your dream, ${dream.title.toLowerCase()}: ${dream.description}`,
        progress: Math.min(now, need), target: need, reward: stage.reward, done, icon: LINK_ICON[stage.link.to] ?? Trophy, link: stage.link,
        extras: i === dream.stages.length - 1 ? ['Living the dream: +5 mood for good'] : ['Opens the next chapter'],
      };
    })
    : [];
  const wishes: QuestView[] = state.life.wishes.map((w) => {
    const t = wishTemplate(w.template);
    return {
      key: w.id, title: t ? t.title(ctx, w) : w.template, detail: 'A wish of your character’s: optional, and there’s no time limit.',
      progress: Math.min(w.progress, w.target), target: w.target, reward: w.reward, done: false, icon: Smile, link: t?.link ?? { to: 'explore' }, extras: ['A lift in mood and fun'],
    };
  });
  const list = tab === 'daily' ? state.life.daily.map((m) => fromMission(m, 'Daily')) : tab === 'weekly' ? state.life.weekly.map((m) => fromMission(m, 'Weekly')) : [...story, ...wishes];

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="quests-title" onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col overflow-hidden bg-[#050505] text-ui-ink sm:h-[min(52rem,94vh)] sm:max-w-md sm:rounded-[2rem] sm:border sm:border-ui-gold/40">
        {open ? (
          <QuestDetails q={open} onBack={() => setOpen(null)} onGo={() => { onGo(open.link); onClose(); }} />
        ) : (
          <>
            <header className="relative flex items-center justify-center px-5 pb-3 pt-6">
              <button type="button" onClick={onClose} aria-label="Back" className="absolute left-4 rounded-full p-2 text-ui-ink hover:text-ui-gold-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold"><ArrowLeft size={22} aria-hidden={true} /></button>
              <h2 id="quests-title" className="m-0 font-display text-2xl font-semibold text-ui-cream">Quests</h2>
            </header>
            <div role="tablist" aria-label="Quest kinds" className="mx-5 flex gap-1 rounded-xl bg-[#1a1815] p-1">
              {(['daily', 'weekly', 'story'] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={`${PILL} capitalize ${tab === t ? 'bg-gradient-to-b from-[#f0c67e] to-[#d9a24a] text-black' : 'text-ui-ink/80 hover:text-ui-ink'}`}>{t}</button>
              ))}
            </div>
            <ul className="m-0 flex-1 list-none space-y-3 overflow-y-auto p-5">
              {list.map((q) => (
                <li key={q.key}>
                  <button type="button" onClick={() => setOpen(q)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-ui-gold/25 bg-[#1a1815] p-4 text-left transition hover:border-ui-gold/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                    <q.icon size={30} className={q.done ? 'shrink-0 text-ui-success' : 'shrink-0 text-ui-ink'} aria-hidden={true} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{q.title}</span>
                      <span className={`mt-1 block text-xs tabular-nums ${q.done ? 'text-ui-success' : 'text-ui-muted'}`}>{fmt(q.progress)}/{fmt(q.target)}</span>
                      <span className="mt-1.5 block"><ProgressBar value={q.progress} max={q.target} done={q.done} /></span>
                    </span>
                    <RewardRing value={q.progress} max={q.target} reward={q.reward} done={q.done} />
                  </button>
                </li>
              ))}
              {tab === 'story' && !dream && (
                <li>
                  <p className="m-0 mb-3 text-sm text-ui-muted">Your story starts with a dream. Pick one: each has five chapters with big GHAI rewards.</p>
                  <div className="space-y-2">
                    {DREAMS.filter((d) => !d.open || d.open(ctx)).map((d) => (
                      <button key={d.id} type="button" onClick={() => onSetDream(d.id)}
                        className="w-full rounded-2xl border border-ui-gold/25 bg-[#1a1815] p-4 text-left hover:border-ui-gold/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                        <span className="block text-sm font-semibold">{d.title}</span>
                        <span className="block text-xs text-ui-muted">{d.description}</span>
                      </button>
                    ))}
                  </div>
                </li>
              )}
              {list.length === 0 && tab !== 'story' && <li className="text-sm text-ui-muted">New quests arrive with the next game {tab === 'daily' ? 'day' : 'week'}.</li>}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/** One quest: what it is, how far along, what it pays, and a button that takes you there. */
function QuestDetails({ q, onBack, onGo }: { q: QuestView; onBack: () => void; onGo: () => void }) {
  return (
    <>
      <div className="relative h-56 shrink-0 overflow-hidden bg-gradient-to-b from-[#2a2117] via-[#120e0a] to-[#050505]">
        <div className="absolute inset-0 grid place-items-center opacity-25"><q.icon size={150} aria-hidden={true} className="text-ui-gold" /></div>
        <button type="button" onClick={onBack} aria-label="Back to quests" className="absolute left-4 top-5 rounded-full bg-black/40 p-2 text-ui-ink hover:text-ui-gold-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold"><ArrowLeft size={22} aria-hidden={true} /></button>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-6">
        <div className="relative flex items-start gap-4">
          <q.icon size={34} className="mt-1 shrink-0 text-ui-ink" aria-hidden={true} />
          <div>
            <h2 className="m-0 text-lg font-semibold">{q.title}</h2>
            <p className="m-0 mt-1 text-sm text-ui-muted">{q.detail}</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-[#1a1815] p-4">
          <ProgressBar value={q.progress} max={q.target} done={q.done} />
          <p className={`m-0 mt-2 text-sm tabular-nums ${q.done ? 'text-ui-success' : 'text-ui-muted'}`}>{fmt(q.progress)}/{fmt(q.target)}</p>
        </div>
        <p className="m-0 mt-6 text-sm font-semibold">Rewards</p>
        <ul className="m-0 mt-3 list-none space-y-3 p-0 text-sm">
          <li className="flex items-center gap-3"><Coins size={22} className="text-ui-gold" aria-hidden={true} /> +{fmt(q.reward)} GHAI</li>
          {q.extras.map((x) => <li key={x} className="flex items-center gap-3"><Sparkles size={22} className="text-ui-gold" aria-hidden={true} /> {x}</li>)}
        </ul>
        <div className="flex-1" />
        {q.done ? (
          <p className="m-0 mt-6 flex items-center justify-center gap-2 rounded-xl border border-ui-success/50 py-3 text-sm font-bold uppercase tracking-[0.14em] text-ui-success"><Check size={18} aria-hidden={true} /> Completed</p>
        ) : (
          <>
            <button type="button" onClick={onGo} className="mt-6 w-full rounded-xl bg-gradient-to-b from-[#e8b452] via-[#d79d3c] to-[#c88a2c] py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-black hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0c67e]">Go do it</button>
            <p className="m-0 mt-2 text-center text-[11px] text-ui-muted">It completes by itself when you&rsquo;ve done it in the city.</p>
          </>
        )}
      </div>
    </>
  );
}
