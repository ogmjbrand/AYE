import type { Slot, Style } from '../lib/fashion';

const uniform = (top: string, bottom: string, shoes: string): Partial<Record<Slot, Style>> => ({
  top: { pattern: 'solid', colors: [top, top, top], scale: 1 },
  bottom: { pattern: 'solid', colors: [bottom, bottom, bottom], scale: 1 },
  shoes: { pattern: 'solid', colors: [shoes, shoes, shoes], scale: 1 },
});

export const NPC_UNIFORMS = {
  host: uniform('#eee8dd', '#eee8dd', '#181715'),
  waiter: uniform('#eee9df', '#252729', '#171819'),
  chef: uniform('#f1eee7', '#34312d', '#1c1b19'),
  office: uniform('#293d4a', '#262b31', '#191919'),
  receptionist: uniform('#e2d4bc', '#e2d4bc', '#181819'),
  fashion: uniform('#7b2e3b', '#7b2e3b', '#1a1918'),
} as const;
