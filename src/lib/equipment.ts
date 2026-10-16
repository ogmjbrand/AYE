/**
 * Equipment: things you buy once and keep. A smartphone unlocks the district
 * map; each career has a work kit that raises that career's pay. Sold at the
 * Gadget Hub. Owned equipment is part of saved progress, like money.
 */
import type { Career } from '../components/CharacterCreation';

export interface EquipmentItem {
  id: string;
  name: string;
  price: number;
  description: string;
  /** Pay bonus for this career when owned (0.1 = +10%). */
  career?: Exclude<Career, 'none'>;
  payBonus?: number;
  /** Unlocks the district map in the HUD. */
  map?: boolean;
}

export const KIT_PAY_BONUS = 0.1;

export const EQUIPMENT: readonly EquipmentItem[] = [
  { id: 'smartphone', name: 'Smartphone', price: 900, map: true, description: 'Maps, directions and distances to every place in the district.' },
  { id: 'kit-student', name: 'Study laptop', price: 1500, career: 'student', payBonus: KIT_PAY_BONUS, description: 'Students earn 10% more with their own laptop.' },
  { id: 'kit-artist', name: 'Studio kit', price: 1200, career: 'artist', payBonus: KIT_PAY_BONUS, description: 'Brushes, canvases and a drawing tablet. Artists earn 10% more.' },
  { id: 'kit-entrepreneur', name: 'Business laptop & POS', price: 2500, career: 'entrepreneur', payBonus: KIT_PAY_BONUS, description: 'Take card payments anywhere. Entrepreneurs earn 10% more.' },
  { id: 'kit-athlete', name: 'Pro boots & tracker', price: 1800, career: 'athlete', payBonus: KIT_PAY_BONUS, description: 'Train smarter. Athletes earn 10% more.' },
  { id: 'kit-engineer', name: 'Engineering laptop', price: 3000, career: 'engineer', payBonus: KIT_PAY_BONUS, description: 'A machine that compiles fast. Engineers earn 10% more.' },
  { id: 'kit-doctor', name: 'Stethoscope & scrubs', price: 2200, career: 'doctor', payBonus: KIT_PAY_BONUS, description: 'Your own kit for every shift. Doctors earn 10% more.' },
  { id: 'kit-pilot', name: 'Flight bag & headset', price: 3500, career: 'pilot', payBonus: KIT_PAY_BONUS, description: 'Noise-cancelling headset and charts. Pilots earn 10% more.' },
];

export const equipmentById = (id: string) => EQUIPMENT.find((e) => e.id === id);

/** Keeps known items only, without duplicates. */
export const sanitiseEquipment = (data: unknown): string[] =>
  Array.isArray(data) ? [...new Set(data.filter((id): id is string => typeof id === 'string' && !!equipmentById(id)))] : [];

/** Multiplier on pay from owned equipment for this career. */
export function equipmentPay(owned: readonly string[], career: Career): number {
  return 1 + owned.reduce((sum, id) => {
    const item = equipmentById(id);
    return sum + (item && item.career === career ? item.payBonus ?? 0 : 0);
  }, 0);
}

export const hasMap = (owned: readonly string[]) => owned.some((id) => equipmentById(id)?.map);

/** Where the Gadget Hub sells: the pavement in front of its shop. */
export const GADGET_HUB = { name: 'Gadget Hub', kind: 'Phones, laptops & work kit', position: [-5.5, 0, 38] as const };
export const atGadgetHub = (x: number, z: number) => Math.hypot(GADGET_HUB.position[0] - x, GADGET_HUB.position[2] - z) <= 3;
