import { DAY_NAMES } from '../lib/gameState';

interface DailyLogModalProps {
  income: number;
  expenses: number;
  netChange: number;
  minutesWorked: number;
  /** The day the player woke up on (0 = Monday). */
  wakeDayOfWeek: number;
  onContinue: () => void;
}

export function DailyLogModal({ income, expenses, netChange, minutesWorked, wakeDayOfWeek, onContinue }: DailyLogModalProps) {
  const nextDay = DAY_NAMES[wakeDayOfWeek];
  const hoursWorked = `${Math.floor(minutesWorked / 60)}h ${String(minutesWorked % 60).padStart(2, '0')}m`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-summary-title"
        className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md w-full mx-4 text-white"
      >
        <h2 id="daily-summary-title" className="font-display text-2xl font-bold mb-6">Daily Summary</h2>

        <div className="space-y-4 font-mono text-sm mb-8">
          <div className="bg-gray-800 rounded p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Hours worked</span>
              <span className="text-gray-200">{hoursWorked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Income</span>
              <span className="text-ui-accent">+{income.toLocaleString()} ⓒ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expenses</span>
              <span className="text-ui-danger">-{expenses.toLocaleString()} ⓒ</span>
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between font-bold">
              <span className={netChange >= 0 ? 'text-ui-accent' : 'text-ui-danger'}>Net Change</span>
              <span className={netChange >= 0 ? 'text-ui-accent' : 'text-ui-danger'}>
                {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()} ⓒ
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          You slept until 07:00. It's now <span className="text-gray-300 font-semibold">{nextDay}</span> morning.
        </p>

        <button
          autoFocus
          onClick={onContinue}
          className="w-full bg-ui-accent hover:bg-ui-accent-strong text-black font-bold py-3 rounded transition"
        >
          Continue to {nextDay}
        </button>
      </div>
    </div>
  );
}
