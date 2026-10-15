interface DailyLogModalProps {
  income: number;
  expenses: number;
  netChange: number;
  dayOfWeek: number;
  onContinue: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function DailyLogModal({ income, expenses, netChange, dayOfWeek, onContinue }: DailyLogModalProps) {
  const nextDay = DAYS[(dayOfWeek + 1) % 7];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md w-full mx-4 text-white">
        <h2 className="font-display text-2xl font-bold mb-6">Daily Summary</h2>

        <div className="space-y-4 font-mono text-sm mb-8">
          <div className="bg-gray-800 rounded p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Income</span>
              <span className="text-aye-green">+{income.toLocaleString()} ⓒ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expenses</span>
              <span className="text-aye-red">-{expenses.toLocaleString()} ⓒ</span>
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between font-bold">
              <span className={netChange >= 0 ? 'text-aye-green' : 'text-aye-red'}>Net Change</span>
              <span className={netChange >= 0 ? 'text-aye-green' : 'text-aye-red'}>
                {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()} ⓒ
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          You woke up refreshed. Tomorrow is <span className="text-gray-300 font-semibold">{nextDay}</span>.
        </p>

        <button
          onClick={onContinue}
          className="w-full bg-aye-green hover:bg-green-600 text-black font-bold py-3 rounded transition"
        >
          Continue to {nextDay}
        </button>
      </div>
    </div>
  );
}
