/**
 * AYE's hospitals: modern medicine and traditional herbal medicine under one roof.
 *
 * Every hospital has the same departments (General Hospital in Lagoon is the one you can walk
 * into; lib/hospitalSite.ts places them):
 * - Modern: emergency reception and the emergency bay, examination, imaging, the laboratory,
 *   the surgical theatre, the pharmacy, rehabilitation, and the recovery ward.
 * - Herbal Medicine Centre: the dispensary, the preparation room, the medicinal garden, the
 *   treatment room and the research bench (lib/herbal.ts, lib/herbalCareer.ts).
 *
 * Each piece of equipment does something: as a patient you pay for a service there and get its
 * effect; on a shift, the staff use it. Conditions here are fictional; the care plan the
 * hospital recommends can be modern, herbal or a combination, and a red-flag emergency is only
 * ever treated by the modern emergency department. Emergency recovery itself is free and never
 * takes anything away (lib/health.ts).
 */
import type { RemedyEffect } from './herbal';

export type DepartmentId =
  | 'emergency' | 'examination' | 'imaging' | 'laboratory' | 'surgery' | 'pharmacy' | 'rehabilitation' | 'recovery'
  | 'herbal-dispensary' | 'herbal-preparation' | 'herbal-garden' | 'herbal-treatment' | 'herbal-research';

export interface Department {
  id: DepartmentId;
  name: string;
  side: 'modern' | 'herbal';
  /** What's in it (drawn by world/HospitalEquipment.tsx). */
  equipment: readonly string[];
  /** Who works there. */
  staff: string;
}

export const DEPARTMENTS: readonly Department[] = [
  { id: 'emergency', name: 'Emergency reception and bay', side: 'modern', equipment: ['Trolley bed', 'Vital-signs monitor', 'Crash cart and defibrillator', 'Oxygen'], staff: 'Emergency doctor, triage nurse' },
  { id: 'examination', name: 'Examination room', side: 'modern', equipment: ['Examination couch', 'Blood-pressure monitor', 'Vital-signs monitor', 'Otoscope and stethoscope'], staff: 'Doctor' },
  { id: 'imaging', name: 'Medical imaging', side: 'modern', equipment: ['CT scanner', 'X-ray console'], staff: 'Radiographer' },
  { id: 'laboratory', name: 'Laboratory', side: 'modern', equipment: ['Microscope', 'Centrifuge', 'Blood analyser', 'Sample fridge'], staff: 'Laboratory scientist' },
  { id: 'surgery', name: 'Surgical theatre', side: 'modern', equipment: ['Operating table', 'Surgical lights', 'Anaesthesia machine', 'Instrument trolley'], staff: 'Surgeon, theatre nurse' },
  { id: 'pharmacy', name: 'Pharmacy', side: 'modern', equipment: ['Dispensing counter', 'Medicine fridge', 'Medicine shelves'], staff: 'Pharmacist' },
  { id: 'rehabilitation', name: 'Rehabilitation', side: 'modern', equipment: ['Parallel bars', 'Treadmill'], staff: 'Physiotherapist' },
  { id: 'recovery', name: 'Recovery ward', side: 'modern', equipment: ['Ward beds', 'Bedside monitors'], staff: 'Ward nurse' },
  { id: 'herbal-dispensary', name: 'Herbal dispensary', side: 'herbal', equipment: ['Dispensary counter', 'Shelves of labelled remedies'], staff: 'Herbal practitioner' },
  { id: 'herbal-preparation', name: 'Herbal preparation room', side: 'herbal', equipment: ['Preparation tables', 'Mortar and pestle', 'Drying racks', 'Copper pot on the stove'], staff: 'Herbal practitioner' },
  { id: 'herbal-garden', name: 'Medicinal plant garden', side: 'herbal', equipment: ['Raised beds of medicinal plants', 'Herb storage'], staff: 'Garden apprentice' },
  { id: 'herbal-treatment', name: 'Herbal treatment room', side: 'herbal', equipment: ['Herbal bath', 'Consultation table', 'Steam chair'], staff: 'Herbal practitioner' },
  { id: 'herbal-research', name: 'Plant research bench', side: 'herbal', equipment: ['Microscope', 'Specimen jars', 'Identification guides'], staff: 'Herbal researcher' },
];

export const departmentById = (id: DepartmentId) => DEPARTMENTS.find((d) => d.id === id)!;

/** A modern service you can have as a patient: what it costs, where, what it does. */
export interface CareService {
  id: string;
  name: string;
  department: DepartmentId;
  price: number;
  minutes: number;
  effect: RemedyEffect;
  /** What happens, said plainly. */
  description: string;
  /** Diagnoses your condition (shows it and the care plan). */
  diagnoses?: true;
  /** Free while your health is critical (the emergency bay). */
  freeWhenCritical?: true;
}

export const CARE_SERVICES: readonly CareService[] = [
  { id: 'svc-checkup', name: 'General check-up', department: 'examination', price: 120, minutes: 20, effect: { heal: 10 }, diagnoses: true, description: 'Blood pressure, pulse, temperature and an examination on the couch, then a care plan.' },
  { id: 'svc-lab', name: 'Laboratory tests', department: 'laboratory', price: 200, minutes: 30, effect: { heal: 4 }, diagnoses: true, description: 'Samples on the analyser and under the microscope: a firmer diagnosis.' },
  { id: 'svc-imaging', name: 'Imaging scan', department: 'imaging', price: 400, minutes: 25, effect: { heal: 6 }, diagnoses: true, description: 'A scan on the CT and X-ray: for sprains, knocks and anything that needs a look inside.' },
  { id: 'svc-emergency', name: 'Emergency treatment', department: 'emergency', price: 300, minutes: 30, effect: { heal: 40, protect: 15 }, freeWhenCritical: true, description: 'Monitored and treated in the emergency bay. Free when your health is critical.' },
  { id: 'svc-procedure', name: 'Minor procedure', department: 'surgery', price: 600, minutes: 45, effect: { heal: 35, protect: 20 }, description: 'Stitches or a small procedure in theatre, under the surgical lights.' },
  { id: 'svc-rehab', name: 'Rehabilitation session', department: 'rehabilitation', price: 150, minutes: 40, effect: { heal: 15, energy: -5 }, description: 'Parallel bars and the treadmill with the physiotherapist.' },
  { id: 'svc-recovery', name: 'Recovery room stay', department: 'recovery', price: 250, minutes: 60, effect: { heal: 30, energy: 15 }, description: 'An hour on the ward with a bedside monitor and a nurse looking in.' },
];

export const serviceById = (id: string) => CARE_SERVICES.find((s) => s.id === id);

export type CarePlanKind = 'modern' | 'herbal' | 'combined';

/** A fictional condition the hospital can find, and what it recommends. */
export interface Condition {
  id: string;
  name: string;
  signs: string;
  /** Red-flag emergency: only the modern emergency department treats it. */
  emergency?: true;
  plan: CarePlanKind;
  /** The modern services and remedies the plan uses. */
  services: readonly string[];
  remedies: readonly string[];
}

export const CONDITIONS: readonly Condition[] = [
  { id: 'harmattan-cough', name: 'Harmattan throat', signs: 'A dry, scratchy throat on dusty days; otherwise well.', plan: 'herbal', services: [], remedies: ['rem-ginger-lemongrass'] },
  { id: 'market-fatigue', name: 'Market-day fatigue', signs: 'Worn out after long days on your feet.', plan: 'herbal', services: [], remedies: ['rem-moringa-bowl', 'rem-lemongrass-steam'] },
  { id: 'minor-burn', name: 'Minor kitchen burn', signs: 'A small, shallow burn from a hot pot.', plan: 'combined', services: ['svc-checkup'], remedies: ['rem-aloe-gel'] },
  { id: 'sprained-ankle', name: 'Sprained ankle', signs: 'Twisted it on a kerb: swollen and sore.', plan: 'combined', services: ['svc-imaging', 'svc-rehab'], remedies: ['rem-turmeric-recovery'] },
  { id: 'unsettled-stomach', name: 'Unsettled stomach', signs: 'A day of a queasy stomach after street food.', plan: 'herbal', services: [], remedies: ['rem-bitter-tonic'] },
  { id: 'lagoon-fever', name: 'Lagoon fever (fictional)', signs: 'Fever and chills after the rains: AYE\'s own illness.', plan: 'combined', services: ['svc-lab', 'svc-recovery'], remedies: ['rem-bitter-tonic'] },
  { id: 'deep-cut', name: 'Deep cut', signs: 'A cut that keeps bleeding.', plan: 'modern', services: ['svc-procedure'], remedies: [] },
  { id: 'collapse', name: 'Collapse with chest pain', signs: 'Chest pain, collapse or trouble breathing.', emergency: true, plan: 'modern', services: ['svc-emergency'], remedies: [] },
];

export const conditionById = (id: string | null | undefined) => CONDITIONS.find((c) => c.id === id);

/**
 * The plans a patient may choose for a condition. Herbal is offered only where it's safe in the
 * game; a red-flag emergency gets the modern plan and nothing else.
 */
export function plansFor(condition: Condition): CarePlanKind[] {
  if (condition.emergency) return ['modern'];
  if (condition.plan === 'modern') return ['modern', 'combined'];
  return ['modern', 'herbal', 'combined'];
}

// ——— Emergency admission ————————————————————————————————————————————————

/** What happens on an emergency stay, in order, by how far through it you are. */
export const ADMISSION_STAGES = [
  { id: 'reception', name: 'Emergency reception', note: 'Brought in by ambulance and met at A&E.' },
  { id: 'assessment', name: 'Initial assessment', note: 'Observations, monitors on, a doctor examines you.' },
  { id: 'assignment', name: 'Assigned a bed', note: 'Moved to the right place for your care.' },
  { id: 'treatment', name: 'Treatment', note: 'Treated by the medical team (and, if you choose, the herbal centre).' },
  { id: 'monitoring', name: 'Recovery monitoring', note: 'On the ward with a bedside monitor and nurses looking in.' },
  { id: 'restored', name: 'Health restored', note: 'Your health is back to full.' },
  { id: 'discharge', name: 'Discharged', note: 'You keep your money, home, career and belongings.' },
] as const;

export type AdmissionStage = (typeof ADMISSION_STAGES)[number]['id'];

/** The stage of a stay this far through it (0 to 1). */
export function admissionStage(progress: number): AdmissionStage {
  const p = Math.max(0, Math.min(1, progress));
  if (p >= 1) return 'discharge';
  if (p >= 0.92) return 'restored';
  if (p >= 0.6) return 'monitoring';
  if (p >= 0.3) return 'treatment';
  if (p >= 0.15) return 'assignment';
  if (p >= 0.05) return 'assessment';
  return 'reception';
}

/** Optional, free extras on an emergency stay: a herbal recovery session alongside the medical care. */
export const RECOVERY_EXTRAS = [
  { id: 'extra-herbal-tea', name: 'Herbal tea round', note: 'Ginger and lemongrass tea from the herbal centre.', effect: { energy: 10 } },
  { id: 'extra-garden-walk', name: 'Garden walk', note: 'A slow walk round the medicinal garden with a practitioner.', effect: { energy: 6 } },
] as const;
