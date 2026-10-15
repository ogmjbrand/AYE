import { useMemo } from 'react';

export interface DailyStats {
  income: number;
  expenses: number;
  netChange: number;
}

// For now, just return placeholder stats; actual tracking would require a backend
export function useDailyTracking(): DailyStats {
  return useMemo(() => ({
    income: 0,
    expenses: 0,
    netChange: 0,
  }), []);
}
