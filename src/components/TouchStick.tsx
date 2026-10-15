import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { setStickInput } from '../hooks/usePlayerController';
import { stickFromOffset } from '../lib/movementInput';

/** Base diameter and how far the knob may travel from centre, in CSS pixels. */
const SIZE = 128;
const TRAVEL = 40;

/**
 * Analog thumb-stick for touch screens: push up to jog forward (further =
 * faster), down to step back, left/right to turn. Only shown on devices
 * whose main pointer is coarse, via the `pointer-coarse:` variant.
 */
export function TouchStick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  // Never leave the player running if the stick unmounts mid-drag
  useEffect(() => () => setStickInput({ forward: 0, turn: 0 }), []);

  const update = (e: PointerEvent<HTMLDivElement>) => {
    const rect = baseRef.current!.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    const scale = len > TRAVEL ? TRAVEL / len : 1;
    setKnob({ x: dx * scale, y: dy * scale });
    setStickInput(stickFromOffset(dx, dy, TRAVEL));
  };

  const release = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerId.current) return;
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    setStickInput({ forward: 0, turn: 0 });
  };

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="Movement stick: drag up to move forward, left or right to turn"
      className="pointer-events-auto relative hidden touch-none select-none rounded-full border border-ui-line/80 bg-ui-panel/55 pointer-coarse:block"
      style={{ width: SIZE, height: SIZE }}
      onPointerDown={(e) => {
        if (pointerId.current !== null) return;
        pointerId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === pointerId.current) update(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Direction ticks */}
      <span aria-hidden className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px] text-ui-muted">▲</span>
      <span aria-hidden className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-ui-faint">▼</span>
      <span aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ui-faint">◀</span>
      <span aria-hidden className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ui-faint">▶</span>
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-ui-accent/60 bg-ui-ink/85 shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
