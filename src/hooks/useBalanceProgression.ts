import { useState, useEffect } from 'react';
import type { Character, Career, Lifestyle } from '../components/CharacterCreation';
import { useTimeProgression, type GameTime } from './useTimeProgression';

const CAREER_RATES: Record<Career, number> = {
  'none': 0,
  'student': 15,
  'artist': 25,
  'entrepreneur': 50,
  'athlete': 40,
  'engineer': 75,
  'doctor': 100,
  'pilot': 90,
};

const LIFESTYLE_COSTS: Record<Lifestyle, number> = {
  'student': 20,
  'ordinary': 50,
  'middle-class': 120,
  'luxury': 250,
};

const BUSINESS_HOURS_START = 9;
const BUSINESS_HOURS_END = 17;

function isBusinessHours(gameTime: GameTime): boolean {
  return gameTime.hour >= BUSINESS_HOURS_START && gameTime.hour < BUSINESS_HOURS_END;
}

export function useBalanceProgression(character: Character | null): number {
  const gameTime = useTimeProgression();
  const [balance, setBalance] = useState<number>(() => character?.balance ?? 0);

  useEffect(() => {
    if (!character) return;

    const interval = setInterval(() => {
      setBalance((prev) => {
        const careerIncome = isBusinessHours(gameTime) ? CAREER_RATES[character.career] : 0;
        const lifestyleCost = LIFESTYLE_COSTS[character.lifestyle];
        const netChange = careerIncome - lifestyleCost;

        return Math.max(0, prev + netChange);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [character, gameTime]);

  return balance;
}
