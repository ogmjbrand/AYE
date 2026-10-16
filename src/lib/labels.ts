import type { Career, Lifestyle } from '../components/CharacterCreation';

export const LIFESTYLE_LABEL: Record<Lifestyle, string> = {
  student: 'Student',
  ordinary: 'Ordinary',
  'middle-class': 'Middle class',
  luxury: 'Luxury',
};

export const CAREER_LABEL: Record<Career, string> = {
  none: 'Undecided',
  student: 'Student',
  artist: 'Artist',
  entrepreneur: 'Entrepreneur',
  athlete: 'Athlete',
  engineer: 'Engineer',
  doctor: 'Doctor',
  pilot: 'Pilot',
};
