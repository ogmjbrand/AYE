/**
 * The rules of a sit, separate from React so they can be tested step by step:
 * walk to the seat, sit, let the chosen minutes pass in small steps, get up.
 * Each step hands its minutes to onWait (the game reducer), and nothing else
 * does, so a sit can never be charged twice: getting up, a new sit or a
 * failed walk all drop whatever was left.
 */
import { waitStep, type Seat } from './seating';

export interface SitPlan {
  seat: Seat;
  /** Shown while sitting, e.g. "Uptown Gardens". */
  place: string;
  /** Game minutes to let pass while seated (0: just sit, the clock runs as normal). */
  minutes: number;
  /** Get up by yourself after this many real seconds (otherwise only when the player does). */
  holdSeconds?: number;
}

export interface SitState extends SitPlan {
  phase: 'walking' | 'seated';
  /** Minutes already passed on the seat. */
  done: number;
}

/** Linger a moment on the seat once the time is up, before getting up. */
export const LINGER_SECONDS = 1.2;

export interface SitDeps {
  onWait: (minutes: number) => void;
  sitAt: (seat: Seat) => void;
  standUp: () => void;
}

export class SitRunner {
  private current: SitState | null = null;
  private tripSeq = -1;
  private remaining = 0;
  private seatedFor = 0;
  private finishAt: number | null = null;
  private deps: SitDeps;
  constructor(deps: SitDeps) { this.deps = deps; }

  get state(): SitState | null { return this.current; }

  /** Swap in the latest wait handler (the game's dispatch can change between renders). */
  setOnWait(onWait: SitDeps['onWait']) { this.deps = { ...this.deps, onWait }; }

  /** A walk to the seat has started (trip number `tripSeq`). Replaces any sit already going. */
  begin(plan: SitPlan, tripSeq: number) {
    this.current = { ...plan, phase: 'walking', done: 0 };
    this.tripSeq = tripSeq;
    this.remaining = plan.minutes;
    this.seatedFor = 0;
    this.finishAt = plan.minutes === 0 && plan.holdSeconds !== undefined ? plan.holdSeconds : null;
  }

  /** A trip ended. Only the walk to this seat counts: arriving sits down, anything else calls the sit off. */
  tripEnded(seq: number, status: 'arrived' | 'cancelled' | 'blocked'): boolean {
    if (!this.current || this.current.phase !== 'walking' || seq !== this.tripSeq) return false;
    if (status === 'arrived') {
      this.current = { ...this.current, phase: 'seated' };
      this.deps.sitAt(this.current.seat);
    } else {
      this.clear();
    }
    return true;
  }

  /** The player got up (or was moved): the sit is over and any time left is dropped. */
  stoodUp(): boolean {
    if (!this.current || this.current.phase !== 'seated') return false;
    this.clear();
    return true;
  }

  /** Called the player off before or during the sit (Cancel / Stand up). */
  cancel() {
    const wasSeated = this.current?.phase === 'seated';
    this.clear();
    if (wasSeated) this.deps.standUp();
  }

  /** Real time passing while seated: hands out this step's minutes, and gets up when it's over. Returns the minutes added. */
  step(seconds: number): number {
    const s = this.current;
    if (!s || s.phase !== 'seated') return 0;
    this.seatedFor += seconds;
    if (this.remaining > 0) {
      const m = waitStep(this.remaining, seconds);
      this.remaining -= m;
      this.current = { ...s, done: s.done + m };
      this.deps.onWait(m);
      if (this.remaining === 0) this.finishAt = this.seatedFor + LINGER_SECONDS;
      return m;
    }
    if (this.finishAt !== null && this.seatedFor >= this.finishAt) {
      this.clear();
      this.deps.standUp();
    }
    return 0;
  }

  private clear() {
    this.current = null;
    this.remaining = 0;
    this.finishAt = null;
    this.tripSeq = -1;
  }
}
