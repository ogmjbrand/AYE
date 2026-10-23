import { carById } from './cars';

/** Shape of each model: body length, width, height of the shoulder and roof, cabin position and wheel size. */
export const CAR_SHAPE: Record<string, { l: number; w: number; body: number; roof: number; cabin: number; cabinLen: number; wheel: number; ground: number }> = {
  hatch: { l: 3.8, w: 1.7, body: 0.62, roof: 1.48, cabin: -0.15, cabinLen: 0.6, wheel: 0.3, ground: 0.16 },
  saloon: { l: 4.4, w: 1.78, body: 0.62, roof: 1.44, cabin: -0.05, cabinLen: 0.48, wheel: 0.32, ground: 0.15 },
  suv: { l: 4.6, w: 1.86, body: 0.82, roof: 1.72, cabin: -0.2, cabinLen: 0.58, wheel: 0.38, ground: 0.22 },
  executive: { l: 4.9, w: 1.86, body: 0.64, roof: 1.46, cabin: -0.12, cabinLen: 0.47, wheel: 0.34, ground: 0.15 },
  coupe: { l: 4.7, w: 1.88, body: 0.56, roof: 1.28, cabin: -0.35, cabinLen: 0.4, wheel: 0.34, ground: 0.12 },
};

/**
 * Where the driver sits in each model (left-hand drive: Songhai drives on the
 * right): across from the middle, along from the middle, and seat height, in metres.
 */
export function driverSeat(model: string): { x: number; z: number; height: number } {
  const s = CAR_SHAPE[model] ?? CAR_SHAPE.saloon;
  const l = carById(model)?.length ?? s.l;
  return { x: s.w * 0.21, z: s.cabin * l * 0.5 - 0.1, height: Math.min(s.ground + 0.3, s.roof - 0.98) };
}
