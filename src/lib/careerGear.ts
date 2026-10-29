/**
 * Work gear: the tools of each career, bought, owned, equipped, worn out,
 * repaired and sold.
 *
 * Rules (tunable):
 *   - Every career has its own catalogue across three slots (tool, tech,
 *     pro), from used and budget pieces to professional ones. Better gear
 *     needs a higher rank in that career (your qualification) as well as the
 *     money; owning gear never lets you do work your rank doesn't.
 *   - One piece per slot can be equipped. Equipped gear in working condition
 *     raises that career's pay by its bonus; spare gear just sits in your
 *     inventory.
 *   - Gear wears with use: each paid minute at work takes its share of the
 *     piece's working life. At 0% it stops helping until repaired.
 *   - Repairs cost a share of the price for the wear being fixed; selling
 *     pays back a share of the price, scaled by condition. Nothing you own is
 *     ever taken away.
 *   - Budget gear is cheaper and wears faster; professional gear helps more
 *     and lasts longer. Both are useful.
 */
import type { Career } from '../components/CharacterCreation';
import { hasQualification, qualificationById, type Qualifications } from './qualifications';

export type GearSlot = 'tool' | 'tech' | 'pro';
export type GearTier = 'used' | 'standard' | 'professional';
export type WorkCareer = Exclude<Career, 'none'>;

export const SLOT_LABEL: Record<GearSlot, string> = { tool: 'Tools', tech: 'Tech', pro: 'Professional kit' };
export const TIER_LABEL: Record<GearTier, string> = { used: 'Used', standard: 'Standard', professional: 'Professional' };

export interface GearItem {
  id: string;
  career: WorkCareer;
  slot: GearSlot;
  tier: GearTier;
  name: string;
  description: string;
  price: number;
  /** Career rank needed to buy and use it (0 = the first rung). */
  rank: number;
  /** Pay bonus while equipped and in working condition (0.05 = +5%). */
  payBonus: number;
  /** Working hours of use from new to worn out. */
  lifeHours: number;
  /** A qualification needed to buy and use it (lib/qualifications.ts). */
  qualification?: string;
}

const g = (career: WorkCareer, slot: GearSlot, tier: GearTier, id: string, name: string, price: number, rank: number, payBonus: number, lifeHours: number, description: string): GearItem =>
  ({ id: `gear-${id}`, career, slot, tier, name, description, price, rank, payBonus, lifeHours });

export const GEAR: readonly GearItem[] = [
  g('doctor', 'tool', 'used', 'stetho-used', 'Refurbished stethoscope', 600, 0, 0.04, 120, 'Does the job; the tubing won’t last forever.'),
  g('doctor', 'tool', 'professional', 'stetho-cardio', 'Cardiology stethoscope', 2600, 1, 0.08, 480, 'Hears what a basic one misses.'),
  g('doctor', 'tech', 'standard', 'pulse-ox', 'Pulse oximeter & BP monitor', 1400, 0, 0.05, 300, 'Fast, reliable readings on every round.'),
  g('doctor', 'pro', 'professional', 'trauma-kit', 'Trauma response kit', 3800, 2, 0.1, 360, 'For registrars and above: everything for the first hour after an injury.'),

  g('engineer', 'tool', 'used', 'multimeter', 'Second-hand multimeter', 500, 0, 0.04, 140, 'Scratched, but it reads true.'),
  g('engineer', 'tool', 'professional', 'diag-kit', 'Diagnostic toolkit', 2400, 1, 0.08, 500, 'Scopes, testers and a proper case.'),
  g('engineer', 'tech', 'standard', 'cad-licence', 'CAD software licence', 1800, 0, 0.05, 400, 'Design and simulate before you build.'),
  g('engineer', 'pro', 'professional', 'workstation', 'Engineering workstation', 6000, 2, 0.12, 900, 'For senior engineers: renders and builds in minutes.'),

  g('pilot', 'tool', 'used', 'headset-used', 'Used aviation headset', 900, 0, 0.04, 160, 'A little worn, still clear on the radio.'),
  g('pilot', 'tech', 'standard', 'efb', 'Electronic flight bag tablet', 4200, 1, 0.08, 520, 'Charts, weather and performance on one screen.'),
  g('pilot', 'pro', 'professional', 'sim-time', 'Simulator training block', 7000, 2, 0.12, 600, 'For first officers and above: practise the emergencies you hope never to fly.'),

  g('artist', 'tool', 'used', 'paints', 'Starter paint set', 300, 0, 0.04, 100, 'Cheap colours, honest results.'),
  g('artist', 'tech', 'standard', 'tablet', 'Drawing tablet', 2200, 1, 0.08, 480, 'Pressure-sensitive and fast.'),
  g('artist', 'pro', 'professional', 'lights', 'Studio lighting rig', 4800, 2, 0.1, 600, 'For exhibiting artists: light your work like a gallery.'),

  g('entrepreneur', 'tool', 'used', 'card-reader', 'Card reader', 400, 0, 0.04, 200, 'Take payments anywhere.'),
  g('entrepreneur', 'tech', 'standard', 'stock-app', 'Stock & accounts software', 1800, 1, 0.08, 600, 'Know what sells and what it earns.'),
  g('entrepreneur', 'pro', 'professional', 'signage', 'Shopfront signage', 5000, 2, 0.1, 900, 'For funded founders: be seen from the street.'),

  g('athlete', 'tool', 'used', 'cones', 'Training cones & bands', 250, 0, 0.04, 120, 'The basics of every session.'),
  g('athlete', 'tech', 'standard', 'gps-vest', 'GPS performance vest', 2000, 1, 0.08, 500, 'Speed, load and heart rate for every drill.'),
  g('athlete', 'pro', 'professional', 'recovery', 'Recovery boots', 5200, 2, 0.1, 700, 'For first-team regulars: back to full fitness sooner.'),

  g('student', 'tool', 'used', 'textbooks', 'Second-hand textbooks', 200, 0, 0.04, 150, 'Someone else’s notes in the margins.'),
  g('student', 'tech', 'standard', 'headphones', 'Noise-cancelling headphones', 1200, 1, 0.08, 500, 'Focus anywhere.'),
  g('student', 'pro', 'professional', 'research-pass', 'Research database pass', 3000, 2, 0.1, 600, 'For final-year students: every journal you need.'),
];

// Professional pieces that need a qualification as well as the rank
const NEEDS: Record<string, string> = { 'gear-trauma-kit': 'doc-als', 'gear-workstation': 'eng-chartered', 'gear-sim-time': 'pil-ir', 'gear-lights': 'art-digital', 'gear-signage': 'ent-books', 'gear-recovery': 'ath-nutrition', 'gear-research-pass': 'stu-research' };
for (const item of GEAR as GearItem[]) if (NEEDS[item.id]) item.qualification = NEEDS[item.id];

export const gearById = (id: string) => GEAR.find((x) => x.id === id);
export const gearFor = (career: Career) => GEAR.filter((x) => x.career === career);

export interface OwnedGear {
  uid: string;
  itemId: string;
  /** 0 … 100: how much working life is left. */
  condition: number;
  equipped: boolean;
}

/** A repair costs this share of the price for wear from 100% to 0%. */
export const REPAIR_SHARE = 0.3;
/** Selling pays back this share of the price at full condition. */
export const RESALE_SHARE = 0.5;

export type GearCheck = { ok: true } | { ok: false; reason: string };

export function canBuy(item: GearItem, career: Career, rankIndex: number, balance: number, owned: readonly OwnedGear[], quals?: Qualifications): GearCheck {
  if (item.career !== career) return { ok: false, reason: 'For another career.' };
  if (rankIndex < item.rank) return { ok: false, reason: `Needs rank ${item.rank + 1} in your career.` };
  if (item.qualification && !(quals && hasQualification(quals, item.qualification))) return { ok: false, reason: `Needs the ${qualificationById(item.qualification)?.name ?? 'right qualification'}.` };
  if (owned.some((o) => o.itemId === item.id)) return { ok: false, reason: 'You own one.' };
  if (balance < item.price) return { ok: false, reason: 'Not enough GHAI.' };
  return { ok: true };
}

/** Buys a piece: it arrives new, and equipped if its slot is free. */
export function buy(owned: readonly OwnedGear[], item: GearItem, uid: string): OwnedGear[] {
  const slotTaken = owned.some((o) => o.equipped && gearById(o.itemId)?.slot === item.slot);
  return [...owned, { uid, itemId: item.id, condition: 100, equipped: !slotTaken }];
}

/** Equips a piece (moving whatever was in its slot back to the inventory), if your rank allows it. */
export function equip(owned: readonly OwnedGear[], uid: string, rankIndex: number, quals?: Qualifications): OwnedGear[] {
  const target = owned.find((o) => o.uid === uid);
  const item = target && gearById(target.itemId);
  if (!target || !item || rankIndex < item.rank) return owned as OwnedGear[];
  if (item.qualification && quals && !hasQualification(quals, item.qualification)) return owned as OwnedGear[];
  return owned.map((o) => (o.uid === uid ? { ...o, equipped: true } : gearById(o.itemId)?.slot === item.slot ? { ...o, equipped: false } : o));
}

export const unequip = (owned: readonly OwnedGear[], uid: string): OwnedGear[] => owned.map((o) => (o.uid === uid ? { ...o, equipped: false } : o));

/** Pay multiplier for this career from equipped gear in working condition. */
export function gearPay(owned: readonly OwnedGear[], career: Career): number {
  return 1 + owned.reduce((sum, o) => {
    const item = gearById(o.itemId);
    return sum + (o.equipped && o.condition > 0 && item && item.career === career ? item.payBonus : 0);
  }, 0);
}

/** One paid minute at work wears this career's equipped gear. */
export function wear(owned: readonly OwnedGear[], career: Career, minutes = 1): OwnedGear[] {
  if (!owned.some((o) => o.equipped)) return owned as OwnedGear[];
  return owned.map((o) => {
    const item = gearById(o.itemId);
    if (!o.equipped || !item || item.career !== career || o.condition <= 0) return o;
    return { ...o, condition: Math.max(0, Math.round((o.condition - (100 * minutes) / (item.lifeHours * 60)) * 1000) / 1000) };
  });
}

export const repairCost = (o: OwnedGear) => {
  const item = gearById(o.itemId);
  return item ? Math.ceil(item.price * REPAIR_SHARE * ((100 - o.condition) / 100)) : 0;
};
export const resaleValue = (o: OwnedGear) => {
  const item = gearById(o.itemId);
  return item ? Math.floor(item.price * RESALE_SHARE * (o.condition / 100)) : 0;
};

export function sanitiseGear(data: unknown): OwnedGear[] {
  if (!Array.isArray(data)) return [];
  const out: OwnedGear[] = [];
  const equippedSlots = new Set<GearSlot>();
  for (const raw of data) {
    const o = raw as Record<string, unknown>;
    const item = typeof o?.itemId === 'string' ? gearById(o.itemId) : undefined;
    if (!item || typeof o.uid !== 'string' || out.some((x) => x.uid === o.uid || x.itemId === item.id)) continue;
    const condition = typeof o.condition === 'number' && Number.isFinite(o.condition) ? Math.max(0, Math.min(100, o.condition)) : 100;
    // One equipped piece per slot, whatever the save says
    const equipped = o.equipped === true && !equippedSlots.has(item.slot);
    if (equipped) equippedSlots.add(item.slot);
    out.push({ uid: o.uid.slice(0, 40), itemId: item.id, condition, equipped });
  }
  return out;
}
