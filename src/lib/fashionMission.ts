import { itemById, type Wardrobe } from './fashion';

export const FASHION_MISSION_REWARD = 300;

export type FashionMissionStage = 'shop' | 'wear' | 'showcase' | 'complete';

export function fashionMissionStage(
  purchasedItemId: string | null,
  completed: boolean,
  wardrobe: Pick<Wardrobe, 'owned' | 'equipped'>,
): FashionMissionStage {
  if (completed) return 'complete';
  if (!purchasedItemId || !wardrobe.owned.includes(purchasedItemId)) return 'shop';
  const item = itemById(purchasedItemId);
  if (!item || wardrobe.equipped[item.slot] !== item.id) return 'wear';
  return 'showcase';
}
