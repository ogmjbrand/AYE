import { SONGHAI } from '../lib/songhai';

/**
 * Songhai's flag: indigo, gold and emerald bands with a gold sun of twelve
 * rays (one for each state) on the gold band. Original artwork.
 */
export function SonghaiFlag({ className = 'h-6 w-9' }: { className?: string }) {
  const f = SONGHAI.flag;
  return (
    <svg viewBox="0 0 36 24" className={`${className} shrink-0 overflow-hidden rounded-[3px] shadow`} role="img" aria-label="Flag of Songhai">
      <rect width="36" height="8" fill={f.top} />
      <rect y="8" width="36" height="8" fill={f.middle} />
      <rect y="16" width="36" height="8" fill={f.bottom} />
      <g transform="translate(18 12)">
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="-0.45" y="-6.4" width="0.9" height="2.6" fill={f.top} transform={`rotate(${i * 30})`} />
        ))}
        <circle r="3.2" fill={f.emblem} stroke={f.top} strokeWidth="0.8" />
      </g>
    </svg>
  );
}
