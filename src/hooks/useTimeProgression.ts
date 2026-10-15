import { useState, useEffect } from 'react';

export interface GameTime {
  hour: number;
  minute: number;
  totalMinutes: number;
  dayOfWeek: number;
  period: 'morning' | 'afternoon' | 'evening' | 'night';
}

export function useTimeProgression(startTime?: GameTime): GameTime {
  const [gameTime, setGameTime] = useState<GameTime>(() => {
    if (startTime) return startTime;
    return {
      hour: 8,
      minute: 0,
      totalMinutes: 8 * 60,
      dayOfWeek: 2,
      period: 'morning',
    };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setGameTime((prev) => {
        let { hour, minute, totalMinutes, dayOfWeek } = prev;

        minute += 1;
        totalMinutes += 1;

        if (minute === 60) {
          minute = 0;
          hour += 1;
        }

        if (hour === 24) {
          hour = 0;
          dayOfWeek = (dayOfWeek + 1) % 7;
        }

        const period = getPeriod(hour);

        return { hour, minute, totalMinutes, dayOfWeek, period };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return gameTime;
}

function getPeriod(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

export function formatGameTime(time: GameTime): string {
  const hourStr = String(time.hour).padStart(2, '0');
  const minuteStr = String(time.minute).padStart(2, '0');
  return `${hourStr}:${minuteStr}`;
}

export function getAmbiance(time: GameTime): { color: string; intensity: number } {
  const { hour } = time;

  if (hour >= 6 && hour < 9) {
    return { color: '#ffd4a3', intensity: 0.6 };
  } else if (hour >= 9 && hour < 12) {
    return { color: '#ffffff', intensity: 1 };
  } else if (hour >= 12 && hour < 18) {
    return { color: '#fffacd', intensity: 1 };
  } else if (hour >= 18 && hour < 21) {
    return { color: '#ff9500', intensity: 0.8 };
  } else {
    return { color: '#1a1a2e', intensity: 0.3 };
  }
}
