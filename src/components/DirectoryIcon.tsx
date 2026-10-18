import {
  BriefcaseBusiness,
  Bus,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Music2,
  Plane,
  ShoppingBag,
  TreePine,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import type { LocationCategory } from '../lib/locations';
import type { Category } from '../lib/cityDirectory';

type DirectoryCategory = LocationCategory | Category;

const ICONS: Record<DirectoryCategory, LucideIcon> = {
  food: Utensils,
  restaurants: Utensils,
  shopping: ShoppingBag,
  education: GraduationCap,
  universities: GraduationCap,
  health: HeartPulse,
  hospitals: HeartPulse,
  fitness: Dumbbell,
  gyms: Dumbbell,
  offices: BriefcaseBusiness,
  workplaces: BriefcaseBusiness,
  finance: Landmark,
  recreation: TreePine,
  parks: TreePine,
  nightlife: Music2,
  stays: House,
  residential: House,
  travel: Plane,
  transport: Bus,
};

export function DirectoryIcon({ category, size = 18, className }: {
  category: DirectoryCategory;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[category];
  return <Icon size={size} className={className} aria-hidden="true" strokeWidth={1.8} />;
}
