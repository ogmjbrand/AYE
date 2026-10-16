/**
 * Getting between cities. Every district has a travel desk (E) selling
 * flights and coaches to the others. A trip costs a fare and takes game time;
 * the clock, hunger and living costs keep running on the way.
 */
export type TravelMode = 'flight' | 'coach';

export interface TravelOption {
  mode: TravelMode;
  label: string;
  fare: number;
  /** Door-to-door game minutes, check-in and border crossings included. */
  minutes: number;
  description: string;
}

export const TRAVEL_OPTIONS: Record<TravelMode, TravelOption> = {
  flight: {
    mode: 'flight',
    label: 'Flight',
    fare: 2500,
    minutes: 3 * 60,
    description: 'About an hour in the air, plus check-in and the ride to and from the airport.',
  },
  coach: {
    mode: 'coach',
    label: 'Coach',
    fare: 800,
    minutes: 12 * 60,
    description: 'Overland along the coast, through Benin and Togo, with border stops on the way.',
  },
};

export const formatDuration = (minutes: number) =>
  minutes % 60 === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
