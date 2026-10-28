import { useEffect, useMemo, useState } from 'react';
import { TASK_REWARD, type WorkTask } from '../lib/workTasks';
import type { WorkPerformance } from '../lib/gameState';

interface WorkTaskPanelProps {
  task: WorkTask;
  workplace: string;
  /** The player's current hourly pay, to show the bonus. */
  hourlyPay: number;
  workPerformance: WorkPerformance;
  onAnswer: (choice: number) => void;
  onClose: () => void;
}

/** Same order every time for a task, but the best answer isn't always first. */
function shuffledOrder(id: string, n: number) {
  let seed = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** One decision from the player's job, with feedback and the reward once answered. */
export function WorkTaskPanel({ task, workplace, hourlyPay, workPerformance, onAnswer, onClose }: WorkTaskPanelProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const order = useMemo(() => shuffledOrder(task.id, task.options.length), [task]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    onAnswer(i);
  };
  const result = picked === null ? null : task.options[picked];
  const reward = result ? TASK_REWARD[result.quality] : null;
  const decisions = workPerformance.excellent + workPerformance.reasonable + workPerformance.poor;
  const excellentRate = decisions === 0 ? 0 : Math.round((workPerformance.excellent / decisions) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-5">
          <div>
            <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">At work · {workplace}</p>
            <h2 id="task-title" className="m-0 mt-1 font-display text-2xl font-bold">{task.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">
            {picked === null ? 'Not now' : 'Done'}
          </button>
        </header>
        <div className="space-y-4 p-5">
          <section aria-label="Career performance" className="rounded-lg border border-ui-line/70 bg-black/10 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold">Career record</span>
              <span className="text-ui-muted">{decisions} {decisions === 1 ? 'decision' : 'decisions'} · {excellentRate}% excellent</span>
            </div>
            <div className="mt-2 flex gap-3 text-[11px] text-ui-muted">
              <span>Excellent {workPerformance.excellent}</span>
              <span>Reasonable {workPerformance.reasonable}</span>
              <span>Needs work {workPerformance.poor}</span>
            </div>
          </section>
          <p className="m-0 text-sm">{task.situation}</p>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">What do you do?</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {order.map((i) => {
              const opt = task.options[i];
              const chosen = picked === i;
              const reveal = picked !== null;
              const tone = !reveal ? 'border-ui-line hover:border-ui-accent'
                : opt.quality === 'best' ? 'border-ui-accent bg-ui-accent/10'
                  : chosen ? 'border-ui-warn bg-ui-warn/10' : 'border-ui-line opacity-60';
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={reveal}
                    onClick={() => choose(i)}
                    aria-pressed={chosen}
                    className={`w-full rounded-xl border p-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-default ${tone}`}
                  >
                    {opt.text}
                    {reveal && (chosen || opt.quality === 'best') && <span className="mt-1 block text-xs text-ui-muted">{opt.why}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {result && reward && (
            <p role="status" className="m-0 rounded-lg bg-black/20 px-3 py-2 text-sm">
              <span className="font-semibold">{reward.label}.</span>{' '}
              {reward.payShare > 0
                ? `Bonus +${Math.round(hourlyPay * reward.payShare)} GHAI and ${reward.xpMinutes} min towards your next promotion.`
                : 'No bonus this time. There will be another task next hour.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
