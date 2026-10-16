/**
 * Who a character is: gender and heritage are the player's own choices and
 * are never inferred. The 3D look is chosen separately (see looks.ts), so a
 * heritage never forces a particular face.
 */

export type Gender = 'woman' | 'man' | 'non-binary' | 'unspecified';

export const GENDERS: readonly { id: Gender; label: string }[] = [
  { id: 'woman', label: 'Woman' },
  { id: 'man', label: 'Man' },
  { id: 'non-binary', label: 'Non-binary' },
  { id: 'unspecified', label: 'Prefer not to say' },
];

/** Broad, self-identified heritage. Players can add a specific ethnic group too (e.g. Yoruba, Igbo, Hausa). */
export const HERITAGES: readonly { id: string; label: string }[] = [
  { id: 'black-african', label: 'Black African' },
  { id: 'black-caribbean', label: 'Black Caribbean' },
  { id: 'african-american', label: 'African American' },
  { id: 'north-african', label: 'North African' },
  { id: 'middle-eastern', label: 'Middle Eastern / Arab' },
  { id: 'south-asian', label: 'South Asian' },
  { id: 'east-asian', label: 'East Asian' },
  { id: 'southeast-asian', label: 'Southeast Asian' },
  { id: 'central-asian', label: 'Central Asian' },
  { id: 'pacific-islander', label: 'Pacific Islander' },
  { id: 'indigenous-american', label: 'Indigenous American' },
  { id: 'latino', label: 'Latino / Hispanic' },
  { id: 'white-european', label: 'White European' },
  { id: 'white-other', label: 'White (other)' },
  { id: 'mixed', label: 'Mixed / multiple heritage' },
  { id: 'other', label: 'Other' },
  { id: 'unspecified', label: 'Prefer not to say' },
];

export const heritageLabel = (id: string) => HERITAGES.find((h) => h.id === id)?.label ?? 'Prefer not to say';
export const genderLabel = (id: Gender) => GENDERS.find((g) => g.id === id)?.label ?? 'Prefer not to say';
