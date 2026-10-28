import { useEffect, useState } from 'react';
import {
  OFFICE_TASK_MINUTES,
  officeChallenge,
  officeJobTitle,
  type OfficeCareerState,
  type OfficeTaskId,
} from '../lib/officeCareer';
import { canClockIntoOffice } from '../lib/officeCareer';
import { formatGameTime, type GameTime } from '../lib/gameState';
import { X } from 'lucide-react';

interface OfficePanelProps {
  mode: 'reception' | 'task';
  career: OfficeCareerState;
  time: GameTime;
  balance: number;
  taskId?: OfficeTaskId;
  onApply: () => void;
  onClockIn: () => void;
  onClockOut: () => void;
  onAnswer: (taskId: OfficeTaskId, choice: number) => void;
  onClose: () => void;
}

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-ui-accent bg-ui-accent px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent';
const secondaryClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-ui-line px-4 py-2 text-sm font-semibold text-ui-ink transition active:scale-[0.98] hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent';

export function OfficePanel({
  mode,
  career,
  time,
  balance,
  taskId,
  onApply,
  onClockIn,
  onClockOut,
  onAnswer,
  onClose,
}: OfficePanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shift = career.activeShift;
  const completed = shift ? Object.values(shift.tasks).filter((item) => item.completed).length : 0;
  const performance = shift
    ? Object.values(shift.tasks).filter((item) => item.completed && item.performance === 'excellent').length
    : 0;
  const task = taskId && shift ? shift.tasks[taskId] : null;
  const challenge = taskId ? officeChallenge(taskId) : null;
  const nextPromotion = [5, 15, 30, 60].find((count) => career.completedShifts.length < count);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-3 sm:items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="office-panel-title"
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-ui-line bg-ui-panel p-5 text-ui-ink shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
              Marina Business Centre
            </p>
            <h2 id="office-panel-title" className="m-0 mt-1 font-display text-2xl font-bold">
              {mode === 'task' && challenge ? challenge.title : 'Reception'}
            </h2>
          </div>
          <button type="button" className={secondaryClass} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        {mode === 'task' && challenge && taskId && shift ? (
          <div className="space-y-4">
            {taskId && (
              <p className="m-0 border-l-2 border-ui-accent pl-3 text-xs text-ui-muted">
                {taskId === 'computer' ? 'You are seated at your assigned workstation.' : taskId === 'meeting' ? 'You are seated with the team at the meeting table.' : 'You are at the document station.'}
              </p>
            )}
            <p className="m-0 text-sm leading-relaxed text-ui-ink/90">{challenge.prompt}</p>
            <p className="m-0 text-sm font-semibold">{challenge.instruction}</p>
            {task?.completed ? (
              <p role="status" className="m-0 rounded-lg border border-ui-accent/40 bg-ui-accent/10 p-3 text-sm">
                Task complete. {task.performance === 'excellent' ? 'Completed on the first attempt.' : 'Completed after reviewing the feedback.'}
              </p>
            ) : (
              <div className="grid gap-2">
                {challenge.choices.map((choice, index) => (
                  <button
                    key={choice}
                    type="button"
                    className={`${secondaryClass} justify-start text-left`}
                    onClick={() => {
                      const correct = index === challenge.correctIndex;
                      setFeedback(correct ? 'Correct. The task is complete.' : 'That does not match the records. Review the details and try again.');
                      onAnswer(taskId, index);
                    }}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}
            {feedback && !task?.completed && <p role="status" className="m-0 text-sm text-ui-warn">{feedback}</p>}
            <p className="m-0 text-xs text-ui-muted">Attempts: {task?.attempts ?? 0}. A completed task takes {OFFICE_TASK_MINUTES} in-game minutes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="m-0 grid gap-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ui-muted">Current time</dt><dd className="m-0 font-mono">{formatGameTime(time)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ui-muted">Balance</dt><dd className="m-0">{balance.toLocaleString()} ⓒ</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ui-muted">Position</dt><dd className="m-0">{career.employed ? career.jobTitle : 'Available position'}</dd></div>
              {career.employed && <div className="flex justify-between gap-4"><dt className="text-ui-muted">Salary</dt><dd className="m-0">{career.salaryPerTask.toLocaleString()} ⓒ per task</dd></div>}
              {career.employed && nextPromotion && <div className="flex justify-between gap-4"><dt className="text-ui-muted">Next role</dt><dd className="m-0 text-right">{officeJobTitle(nextPromotion)} · {nextPromotion - career.completedShifts.length} shifts</dd></div>}
            </dl>

            {!career.employed ? (
              <>
                <p className="m-0 text-sm leading-relaxed">Apply for an entry-level Office Assistant position. Wages are paid only after completing the assigned tasks and clocking out.</p>
                <button type="button" className={buttonClass} onClick={onApply}>Apply for the job</button>
              </>
            ) : shift ? (
              <>
                <div className="rounded-lg border border-ui-line p-3">
                  <p className="m-0 font-semibold">Shift in progress</p>
                  <p className="m-0 mt-1 text-sm text-ui-muted">{completed} of 3 tasks complete</p>
                  <p className="m-0 mt-1 text-sm text-ui-muted">Performance: {performance} excellent, {completed - performance} reviewed</p>
                  <p className="m-0 mt-1 text-sm text-ui-muted">Gross pay: {(completed * career.salaryPerTask).toLocaleString()} ⓒ · Deductions: 0 ⓒ</p>
                </div>
                <button type="button" className={buttonClass} disabled={completed !== 3} onClick={onClockOut}>Clock out and receive payment</button>
                {completed !== 3 && <p className="m-0 text-xs text-ui-muted">Complete all three workplace tasks before clocking out.</p>}
              </>
            ) : (
              <>
                <p className="m-0 text-sm leading-relaxed">
                  {career.jobTitle}, level {career.careerLevel}. Office shifts are available from 09:00 to 15:00.
                </p>
                <p className="m-0 text-sm text-ui-muted">
                  Completed shifts: {career.completedShifts.length}.
                </p>
                <button type="button" className={buttonClass} disabled={!canClockIntoOffice(time)} onClick={onClockIn}>
                  Clock in for today
                </button>
                {!canClockIntoOffice(time) && <p className="m-0 text-xs text-ui-muted">Come back during the clock-in window.</p>}
              </>
            )}
            <button type="button" className={secondaryClass} onClick={onClose}>Close</button>
          </div>
        )}
      </section>
    </div>
  );
}
