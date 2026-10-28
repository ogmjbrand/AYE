import { itemById, SLOTS, type Wardrobe } from './fashion';

export interface FashionShowcaseResult {
  score: number;
  wornPieces: number;
  coordinated: boolean;
  tier: 'First steps' | 'Well styled' | 'Spotlight';
  reward: number;
}

const PARTICIPATION_REWARD = 75;
const POINT_REWARD = 3;

function sharesColour(a: readonly string[], b: readonly string[]): boolean {
  return a.some((colour) => b.some((other) => colour.toLowerCase() === other.toLowerCase()));
}

/** Scores owned, currently worn clothes; item price and collection do not affect the result. */
export function fashionShowcaseResult(wardrobe: Pick<Wardrobe, 'owned' | 'equipped'>): FashionShowcaseResult {
  const worn = SLOTS.flatMap((slot) => {
    const id = wardrobe.equipped[slot];
    const item = id && wardrobe.owned.includes(id) ? itemById(id) : undefined;
    return item?.slot === slot ? [item] : [];
  });
  const top = worn.find((item) => item.slot === 'top');
  const bottom = worn.find((item) => item.slot === 'bottom');
  const coordinated = !!top && !!bottom
    && (
      (top.style.pattern !== 'solid' && top.style.pattern === bottom.style.pattern)
      || sharesColour(top.style.colors, bottom.style.colors)
    );
  const score = Math.min(100, 20 + worn.length * 15 + (coordinated ? 20 : 0));
  return {
    score,
    wornPieces: worn.length,
    coordinated,
    tier: score >= 80 ? 'Spotlight' : score >= 60 ? 'Well styled' : 'First steps',
    reward: PARTICIPATION_REWARD + score * POINT_REWARD,
  };
}
