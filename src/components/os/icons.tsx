import { ICON_PATHS, type IconName } from './iconPaths';

export type { IconName };

/** Small stroke icons for the Life OS and HUD, drawn to a 24-unit grid. Decorative: always paired with a text label. */
export function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
