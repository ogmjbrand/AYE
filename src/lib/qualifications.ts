/**
 * Qualifications: certificates and diplomas you earn for your career.
 *
 * Rules (tunable):
 *   - Each career has a certificate and a diploma. A diploma needs a rank in
 *     the career (rank 3, index 2) before you can enrol.
 *   - Enrolling costs a course fee in GHAI, once.
 *   - You study in hour-long sessions at a study place: the desk at home, the
 *     university library or a workplace training room. Studying takes the
 *     game time it says.
 *   - Once the hours are done you sit the exam: real questions about the
 *     subject. Three out of four or better passes. A fail costs nothing but
 *     a day's wait before the retake (no extra fee: no paying to win).
 *   - A qualification raises your pay in that career and unlocks the
 *     professional gear that needs it (lib/careerGear.ts). Buying gear never
 *     gives you the qualification.
 *   - Qualifications are saved; you keep them if you change career.
 *
 * Everything is checked in the game reducer; a server can run the same
 * functions (docs/CAREER_ECONOMY.md).
 */
import type { Career } from '../components/CharacterCreation';

export interface ExamQuestion {
  prompt: string;
  options: readonly string[];
  answer: number;
}

export interface Qualification {
  id: string;
  career: Exclude<Career, 'none'>;
  name: string;
  kind: 'certificate' | 'diploma';
  description: string;
  fee: number;
  /** Hours of study before the exam. */
  studyHours: number;
  /** Career rank needed to enrol (0 = any). */
  rank: number;
  /** Pay bonus in this career once earned (0.06 = +6%). */
  payBonus: number;
  exam: readonly ExamQuestion[];
}

export const STUDY_SESSION_MINUTES = 60;
export const PASS_MARK = 3;
export const RETAKE_WAIT_MINUTES = 24 * 60;

const q = (prompt: string, options: readonly string[], answer: number): ExamQuestion => ({ prompt, options, answer });

export const QUALIFICATIONS: readonly Qualification[] = [
  {
    id: 'doc-als', career: 'doctor', kind: 'certificate', name: 'Advanced Life Support', fee: 1500, studyHours: 4, rank: 0, payBonus: 0.06,
    description: 'Resuscitation, defibrillation and the first minutes of a cardiac arrest.',
    exam: [
      q('An adult collapses and isn’t breathing normally. What comes first?', ['Look for a pulse for a full minute', 'Call for help and start chest compressions', 'Give five rescue breaths'], 1),
      q('Chest compressions for an adult should be about…', ['2 cm deep, 60 a minute', '5–6 cm deep, 100–120 a minute', '10 cm deep, 150 a minute'], 1),
      q('Which rhythm can a defibrillator shock?', ['Ventricular fibrillation', 'Asystole (flat line)', 'Normal sinus rhythm'], 0),
      q('During CPR, adrenaline is given…', ['Never', 'Every 3–5 minutes', 'Once, after 30 minutes'], 1),
    ],
  },
  {
    id: 'doc-em', career: 'doctor', kind: 'diploma', name: 'Diploma in Emergency Medicine', fee: 4500, studyHours: 8, rank: 2, payBonus: 0.1,
    description: 'Triage, trauma and the acutely unwell patient. For registrars and above.',
    exam: [
      q('In triage, who is seen first?', ['Whoever arrived first', 'The patient whose life is most at risk', 'The patient in the most pain'], 1),
      q('The primary survey of an injured patient starts with…', ['Airway with spine protection', 'Taking a full history', 'An X-ray of the injury'], 0),
      q('Signs of shock include…', ['Slow pulse and warm skin', 'Fast pulse, pale clammy skin, low blood pressure', 'High fever only'], 1),
      q('A burns patient’s fluids are guided by…', ['The size of the burn and their weight', 'The colour of the burn', 'Whatever they ask to drink'], 0),
    ],
  },
  {
    id: 'eng-safety', career: 'engineer', kind: 'certificate', name: 'Electrical Safety Certificate', fee: 1200, studyHours: 4, rank: 0, payBonus: 0.06,
    description: 'Safe isolation, earthing and working on live systems.',
    exam: [
      q('Before working on a circuit you should…', ['Isolate it, lock it off and prove it dead', 'Just switch it off at the wall', 'Wear rubber gloves and carry on'], 0),
      q('What does an RCD do?', ['Makes lights brighter', 'Cuts the power when current leaks to earth', 'Stores electricity'], 1),
      q('Ohm’s law says voltage equals…', ['Current × resistance', 'Current ÷ resistance', 'Power × time'], 0),
      q('Why are metal appliance cases earthed?', ['To save energy', 'So a fault trips the supply instead of electrifying the case', 'For decoration'], 1),
    ],
  },
  {
    id: 'eng-chartered', career: 'engineer', kind: 'diploma', name: 'Chartered Engineer', fee: 5000, studyHours: 8, rank: 2, payBonus: 0.1,
    description: 'Professional standards, design responsibility and project ethics. For senior engineers.',
    exam: [
      q('A design you signed off has a safety flaw. You should…', ['Say nothing and hope', 'Report it and get it fixed, even if it costs time', 'Blame the contractor'], 1),
      q('A factor of safety in design means…', ['Building in strength beyond the expected load', 'Using the cheapest material', 'Finishing early'], 0),
      q('Which comes first in a project?', ['Ordering materials', 'Defining requirements', 'Painting'], 1),
      q('Peer review of calculations is there to…', ['Catch mistakes before they’re built', 'Slow projects down', 'Share the blame'], 0),
    ],
  },
  {
    id: 'pil-ir', career: 'pilot', kind: 'certificate', name: 'Instrument Rating', fee: 2500, studyHours: 5, rank: 0, payBonus: 0.06,
    description: 'Flying by instruments alone, in cloud and at night.',
    exam: [
      q('The attitude indicator shows…', ['The aircraft’s pitch and bank', 'Fuel remaining', 'Cabin temperature'], 0),
      q('In cloud, a pilot should trust…', ['Their sense of balance', 'The instruments', 'The view outside'], 1),
      q('An ILS approach guides you…', ['Down to the runway, left-right and up-down', 'Only to the airport', 'Across the ocean'], 0),
      q('Before take-off, the altimeter is set to…', ['Any value', 'The local pressure setting given by the tower', 'Zero'], 1),
    ],
  },
  {
    id: 'pil-mcc', career: 'pilot', kind: 'diploma', name: 'Multi-Crew Cooperation', fee: 6000, studyHours: 8, rank: 2, payBonus: 0.1,
    description: 'Working as a two-pilot crew: checklists, call-outs and decisions. For first officers and above.',
    exam: [
      q('If the captain is about to make a mistake, the first officer should…', ['Stay quiet out of respect', 'Speak up clearly and early', 'Wait until landing'], 1),
      q('Checklists are read…', ['From memory, quickly', 'Aloud, item by item, with replies', 'Only in emergencies'], 1),
      q('“Pilot flying” and “pilot monitoring” means…', ['One flies, the other checks and handles radios and checklists', 'Both fly together', 'One sleeps'], 0),
      q('After an engine failure, the crew’s first priority is…', ['Calling the airline', 'Flying the aircraft', 'Reading the manual'], 1),
    ],
  },
  {
    id: 'art-digital', career: 'artist', kind: 'certificate', name: 'Digital Illustration Certificate', fee: 900, studyHours: 4, rank: 0, payBonus: 0.06,
    description: 'Layers, colour and composition on a drawing tablet.',
    exam: [
      q('Complementary colours sit…', ['Next to each other on the colour wheel', 'Opposite each other on the colour wheel', 'Anywhere'], 1),
      q('The rule of thirds helps with…', ['Composition', 'File size', 'Printing'], 0),
      q('Working in layers lets you…', ['Change parts without redrawing everything', 'Print faster', 'Use fewer colours'], 0),
      q('For print, images are usually prepared at…', ['72 dpi', '300 dpi', '10 dpi'], 1),
    ],
  },
  {
    id: 'art-curation', career: 'artist', kind: 'diploma', name: 'Diploma in Exhibition Practice', fee: 3500, studyHours: 8, rank: 2, payBonus: 0.1,
    description: 'Hanging a show, pricing work and writing about it. For exhibiting artists.',
    exam: [
      q('Gallery work is usually hung with its centre at about…', ['Eye level, around 1.5 m', 'Floor level', 'Ceiling height'], 0),
      q('An artist statement should…', ['Explain the ideas behind the work, briefly', 'List every exhibition ever', 'Be left blank'], 0),
      q('Pricing work consistently means…', ['Similar sizes and media sell at similar prices', 'Changing prices for each buyer', 'Always the highest price'], 0),
      q('Before shipping a painting it should be…', ['Rolled tightly', 'Wrapped, cornered and crated or boxed', 'Sent bare'], 1),
    ],
  },
  {
    id: 'ent-books', career: 'entrepreneur', kind: 'certificate', name: 'Bookkeeping Certificate', fee: 1000, studyHours: 4, rank: 0, payBonus: 0.06,
    description: 'Income, expenses, cash flow and keeping proper records.',
    exam: [
      q('Profit is…', ['Income minus costs', 'Everything you take in', 'Money in the bank'], 0),
      q('Cash flow problems happen when…', ['Money goes out before it comes in', 'You make a profit', 'You have savings'], 0),
      q('Receipts should be kept…', ['Never', 'For every business expense', 'Only for big purchases'], 1),
      q('A balance sheet shows…', ['What the business owns and owes', 'Today’s weather', 'Staff birthdays'], 0),
    ],
  },
  {
    id: 'ent-mgmt', career: 'entrepreneur', kind: 'diploma', name: 'Diploma in Business Management', fee: 5000, studyHours: 8, rank: 2, payBonus: 0.1,
    description: 'Strategy, people and growing a business. For funded founders.',
    exam: [
      q('Your best customers are usually…', ['The ones who come back', 'The ones who complain', 'People who never buy'], 0),
      q('A good hire is judged mostly on…', ['Skills and attitude for the job', 'Who they know', 'Their shoes'], 0),
      q('Growing too fast without cash can…', ['Make a business fail even when sales are good', 'Never cause problems', 'Lower costs'], 0),
      q('A unique selling point is…', ['Why customers choose you over others', 'Your cheapest product', 'Your logo'], 0),
    ],
  },
  {
    id: 'ath-nutrition', career: 'athlete', kind: 'certificate', name: 'Sports Nutrition Certificate', fee: 800, studyHours: 4, rank: 0, payBonus: 0.06,
    description: 'Fuel, hydration and recovery for training and match days.',
    exam: [
      q('The main fuel for hard exercise is…', ['Carbohydrate', 'Vitamins', 'Salt'], 0),
      q('After training, protein helps…', ['Muscles repair', 'You sleep less', 'Burn fat instantly'], 0),
      q('Losing 2% of body weight in sweat…', ['Has no effect', 'Lowers performance', 'Improves speed'], 1),
      q('A pre-match meal is best eaten…', ['Right before kick-off', 'About 3 hours before', 'The day before only'], 1),
    ],
  },
  {
    id: 'ath-coach', career: 'athlete', kind: 'diploma', name: 'Coaching Licence', fee: 3800, studyHours: 8, rank: 2, payBonus: 0.1,
    description: 'Planning sessions, coaching players and keeping them safe. For first-team regulars.',
    exam: [
      q('A session should start with…', ['A warm-up', 'A match', 'Sprints at full speed'], 0),
      q('Good feedback is…', ['Specific and about what to do next', 'Shouted', 'Only praise'], 0),
      q('A player with a suspected concussion should…', ['Play on if they feel fine', 'Stop and be assessed', 'Drink water and continue'], 1),
      q('Training load should rise…', ['Gradually', 'All at once', 'Only before tournaments'], 0),
    ],
  },
  {
    id: 'stu-research', career: 'student', kind: 'certificate', name: 'Research Methods Certificate', fee: 600, studyHours: 4, rank: 0, payBonus: 0.06,
    description: 'Asking good questions, sampling and reading the evidence.',
    exam: [
      q('A control group is…', ['A group that doesn’t get the treatment, for comparison', 'The researchers', 'The largest group'], 0),
      q('Correlation means…', ['One thing causes the other', 'Two things change together', 'Nothing'], 1),
      q('A bigger random sample usually…', ['Gives more reliable results', 'Makes results worse', 'Doesn’t matter'], 0),
      q('Peer-reviewed sources are…', ['Checked by other experts before publishing', 'Written anonymously online', 'Always opinion'], 0),
    ],
  },
  {
    id: 'stu-writing', career: 'student', kind: 'diploma', name: 'Academic Writing Diploma', fee: 2000, studyHours: 8, rank: 2, payBonus: 0.1,
    description: 'Arguments, structure and citing your sources. For final-year students.',
    exam: [
      q('A thesis statement is…', ['A clear, arguable claim', 'A question', 'A quotation'], 0),
      q('Using someone’s words without credit is…', ['Paraphrasing', 'Plagiarism', 'Summarising'], 1),
      q('Each paragraph should…', ['Make one main point', 'Make every point', 'Be one sentence'], 0),
      q('A conclusion should…', ['Bring in new evidence', 'Draw the argument together', 'Repeat the introduction word for word'], 1),
    ],
  },
];

export const qualificationById = (id: string) => QUALIFICATIONS.find((x) => x.id === id);
export const qualificationsFor = (career: Career) => QUALIFICATIONS.filter((x) => x.career === career);

export interface Qualifications {
  /** Enrolled courses and the minutes studied on each. */
  enrolled: Record<string, number>;
  /** Earned qualification ids, with the minute each was earned. */
  earned: Record<string, number>;
  /** When each exam was last failed (retakes wait a day). */
  failedAt: Record<string, number>;
}

export const emptyQualifications = (): Qualifications => ({ enrolled: {}, earned: {}, failedAt: {} });
export const hasQualification = (q: Qualifications, id: string) => id in q.earned;

export type QualCheck = { ok: true } | { ok: false; reason: string };

export function canEnrol(q: Qualifications, item: Qualification, rankIndex: number, balance: number): QualCheck {
  if (hasQualification(q, item.id)) return { ok: false, reason: 'You hold this already.' };
  if (item.id in q.enrolled) return { ok: false, reason: 'You’re enrolled.' };
  if (rankIndex < item.rank) return { ok: false, reason: `Needs rank ${item.rank + 1} in your career.` };
  if (balance < item.fee) return { ok: false, reason: 'Not enough GHAI for the course fee.' };
  return { ok: true };
}

export const enrol = (q: Qualifications, id: string): Qualifications => ({ ...q, enrolled: { ...q.enrolled, [id]: 0 } });

export function canStudy(q: Qualifications, item: Qualification, atStudyPlace: boolean): QualCheck {
  if (!(item.id in q.enrolled)) return { ok: false, reason: 'Enrol first.' };
  if (q.enrolled[item.id] >= item.studyHours * 60) return { ok: false, reason: 'Study done: sit the exam.' };
  if (!atStudyPlace) return { ok: false, reason: 'Study at your desk at home, the university library or a training room.' };
  return { ok: true };
}

export const study = (q: Qualifications, id: string, minutes: number): Qualifications => ({ ...q, enrolled: { ...q.enrolled, [id]: (q.enrolled[id] ?? 0) + minutes } });

export function canSitExam(q: Qualifications, item: Qualification, now: number): QualCheck {
  if (!(item.id in q.enrolled)) return { ok: false, reason: 'Enrol first.' };
  if (q.enrolled[item.id] < item.studyHours * 60) return { ok: false, reason: `Study ${Math.ceil((item.studyHours * 60 - q.enrolled[item.id]) / 60)} more hour(s) first.` };
  const failed = q.failedAt[item.id];
  if (failed !== undefined && now - failed < RETAKE_WAIT_MINUTES) return { ok: false, reason: 'You can retake tomorrow.' };
  return { ok: true };
}

/** Marks an exam. Answers are option indexes, one per question. */
export function score(item: Qualification, answers: readonly number[]): number {
  return item.exam.reduce((n, question, i) => n + (answers[i] === question.answer ? 1 : 0), 0);
}

export function sitExam(q: Qualifications, item: Qualification, answers: readonly number[], now: number): { q: Qualifications; passed: boolean; score: number } {
  const s = score(item, answers);
  if (s >= PASS_MARK) {
    const enrolled = { ...q.enrolled };
    delete enrolled[item.id];
    const failedAt = { ...q.failedAt };
    delete failedAt[item.id];
    return { q: { enrolled, earned: { ...q.earned, [item.id]: now }, failedAt }, passed: true, score: s };
  }
  return { q: { ...q, failedAt: { ...q.failedAt, [item.id]: now } }, passed: false, score: s };
}

/** Pay multiplier in this career from qualifications held. */
export function qualificationPay(q: Qualifications, career: Career): number {
  return 1 + QUALIFICATIONS.filter((x) => x.career === career && hasQualification(q, x.id)).reduce((sum, x) => sum + x.payBonus, 0);
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/** Loads qualifications from a save: unknown ids dropped, study capped at the course's hours. */
export function sanitiseQualifications(data: unknown): Qualifications {
  const out = emptyQualifications();
  if (!data || typeof data !== 'object') return out;
  const d = data as Record<string, Record<string, unknown> | undefined>;
  for (const [id, v] of Object.entries(d.earned ?? {})) { const item = qualificationById(id); const t = num(v); if (item && t !== null) out.earned[id] = t; }
  for (const [id, v] of Object.entries(d.enrolled ?? {})) {
    const item = qualificationById(id); const m = num(v);
    if (item && m !== null && !(id in out.earned)) out.enrolled[id] = Math.min(m, item.studyHours * 60);
  }
  for (const [id, v] of Object.entries(d.failedAt ?? {})) { const t = num(v); if (qualificationById(id) && t !== null && id in out.enrolled) out.failedAt[id] = t; }
  return out;
}
