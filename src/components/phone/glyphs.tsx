import { PATHS, type GlyphName } from './icons';

export function Glyph({ name, className = 'h-5 w-5' }: { name: GlyphName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
