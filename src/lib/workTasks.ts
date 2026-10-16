/**
 * Work tasks: short, realistic decisions from each career, offered once per
 * game hour while you're at your workplace during working hours. The answer
 * is scored from this data (never from the client's say-so), so a server can
 * apply exactly the same rules later.
 */
import type { Career } from '../components/CharacterCreation';

export type Quality = 'best' | 'ok' | 'poor';

export interface TaskOption {
  text: string;
  quality: Quality;
  /** Why, shown after choosing. */
  why: string;
}

export interface WorkTask {
  id: string;
  career: Exclude<Career, 'none'>;
  title: string;
  situation: string;
  options: readonly [TaskOption, TaskOption, TaskOption];
}

/** Bonus as a share of an hour's pay, and extra minutes counted towards promotion. */
export const TASK_REWARD: Record<Quality, { payShare: number; xpMinutes: number; label: string }> = {
  best: { payShare: 0.5, xpMinutes: 30, label: 'Excellent call' },
  ok: { payShare: 0.2, xpMinutes: 10, label: 'Reasonable' },
  poor: { payShare: 0, xpMinutes: 0, label: 'Not the best choice' },
};

const t = (id: string, career: WorkTask['career'], title: string, situation: string, options: WorkTask['options']): WorkTask =>
  ({ id, career, title, situation, options });
const o = (text: string, quality: Quality, why: string): TaskOption => ({ text, quality, why });

export const WORK_TASKS: readonly WorkTask[] = [
  // Doctor
  t('doc-triage', 'doctor', 'Busy emergency room', 'Three patients arrive together: a man with crushing chest pain and sweating, a child with a fever of 38 °C who is playing, and a woman with a sprained ankle.', [
    o('See the man with chest pain first', 'best', 'Chest pain with sweating could be a heart attack. Minutes matter, so he is seen first.'),
    o('See the child first, because children come first', 'poor', 'A playful child with a moderate fever is stable. The possible heart attack is the emergency.'),
    o('See them in the order they arrived', 'ok', 'Fair, but triage means treating the most urgent first, not first come first served.'),
  ]),
  t('doc-malaria', 'doctor', 'Fever in the rainy season', 'A young woman has had fever, chills and headache for two days. The clinic has rapid malaria tests.', [
    o('Do a rapid malaria test before treating', 'best', 'Testing first confirms malaria and avoids giving drugs that are not needed.'),
    o('Give antimalarials straight away without testing', 'ok', 'Often done when tests are unavailable, but here a test is quick and guides the right treatment.'),
    o('Send her home with painkillers', 'poor', 'Untreated malaria can become severe. She needs testing today.'),
  ]),
  t('doc-handover', 'doctor', 'End of shift', 'Your shift ends in ten minutes. One patient is waiting for blood results that will decide their treatment.', [
    o('Hand over to the next doctor with clear notes on what to do with the results', 'best', 'A clear handover keeps the patient safe and the next doctor informed.'),
    o('Leave and check the results tomorrow', 'poor', 'The patient could wait a whole night for a decision. Always hand over.'),
    o('Stay late until the results come back', 'ok', 'Kind, but tiring for you and not needed if you hand over properly.'),
  ]),
  // Engineer
  t('eng-outage', 'engineer', 'Payments are failing', 'Right after your team released an update, customers report that card payments are failing.', [
    o('Roll back the release, then investigate', 'best', 'Restore service first; find the cause once customers can pay again.'),
    o('Debug the live system while payments keep failing', 'poor', 'Every minute of failed payments costs customers and trust. Roll back first.'),
    o('Post on social media that payments are down', 'ok', 'Telling customers is good, but it should come alongside fixing the problem.'),
  ]),
  t('eng-review', 'engineer', 'Code review', 'A teammate asks you to approve a change today. It works, but it stores user passwords in plain text.', [
    o('Request changes: passwords must be hashed', 'best', 'Plain-text passwords are a serious security risk. Hashing them is standard practice.'),
    o('Approve it and open a ticket to fix it later', 'poor', '"Later" often never comes, and a leak in the meantime would be very damaging.'),
    o('Approve it, since it works', 'poor', 'Working is not enough when user security is at stake.'),
  ]),
  t('eng-estimate', 'engineer', 'Deadline pressure', 'Your manager asks if a big feature can ship in one week. You think it needs three.', [
    o('Explain your estimate and offer a smaller first version that fits one week', 'best', 'Honest estimates plus options help everyone plan.'),
    o('Say yes and work every night', 'poor', 'Over-promising leads to burnout and bugs.'),
    o('Just say no', 'ok', 'Honest, but offering an alternative is more helpful.'),
  ]),
  // Student
  t('stu-exam', 'student', 'Exams next week', 'You have three exams next week and only today to plan your revision.', [
    o('Make a timetable that spreads revision across all three, with breaks', 'best', 'Spaced practice with rest works better than cramming.'),
    o('Revise the subject you like most', 'poor', 'The others will suffer. Balance your time.'),
    o('Plan to stay up all night before each exam', 'poor', 'Sleep is when memory consolidates. All-nighters hurt results.'),
  ]),
  t('stu-group', 'student', 'Group project', 'One member of your group has not done their part, and the deadline is in two days.', [
    o('Talk to them privately, then agree a plan and tell the lecturer if nothing changes', 'best', 'Direct, fair and it protects the group.'),
    o('Do their part yourself without saying anything', 'ok', 'Saves the grade but teaches nothing and wears you out.'),
    o('Complain about them in the class group chat', 'poor', 'Public shaming rarely fixes anything.'),
  ]),
  t('stu-source', 'student', 'Essay sources', 'You find a perfect paragraph online for your essay.', [
    o('Put it in your own words and cite the source', 'best', 'That is how academic writing works, and it avoids plagiarism.'),
    o('Copy it word for word without citing', 'poor', 'That is plagiarism and can fail the whole course.'),
    o('Copy it in quotation marks and cite it', 'ok', 'Allowed, but too many quotes weaken your own argument.'),
  ]),
  // Artist
  t('art-commission', 'artist', 'A commission', 'A client wants a large painting but will only pay half of your usual price.', [
    o('Offer a smaller piece at their budget, or the full piece at your price', 'best', 'You respect your work and still give them an option.'),
    o('Accept and rush it', 'poor', 'Underpricing and rushing hurts your work and your reputation.'),
    o('Refuse without explanation', 'ok', 'You protect your price, but you might lose a client you could have kept.'),
  ]),
  t('art-exhibition', 'artist', 'Exhibition tomorrow', 'A gallery asks you to show work tomorrow. One piece is not quite finished.', [
    o('Show your finished pieces and mention the new one as coming soon', 'best', 'Quality first, and it creates interest in your next work.'),
    o('Finish it overnight and show it anyway', 'ok', 'It might work, but rushed work can show.'),
    o('Turn down the exhibition', 'poor', 'A missed chance to be seen. Show what you have.'),
  ]),
  t('art-online', 'artist', 'Your work online', 'Someone is selling prints of your painting online without permission.', [
    o('Contact them and report it to the platform with proof that it is yours', 'best', 'Calm, documented steps are the most effective.'),
    o('Ignore it', 'poor', 'Others may copy you too. Protect your rights.'),
    o('Post angrily about them everywhere', 'ok', 'It raises awareness, but the platform report is what removes the listings.'),
  ]),
  // Entrepreneur
  t('ent-cash', 'entrepreneur', 'Cash is tight', 'A big customer will pay you in 60 days, but you must pay your staff this week.', [
    o('Ask the customer for part payment now and talk to your bank about short-term credit', 'best', 'Managing cash flow keeps the business alive.'),
    o('Delay salaries without telling staff', 'poor', 'Breaks trust and the law. Talk to people and find the money.'),
    o('Cancel the customer order', 'poor', 'You lose the revenue you need.'),
  ]),
  t('ent-price', 'entrepreneur', 'A competitor cuts prices', 'A competitor drops their price by 30%. Your margins are already thin.', [
    o('Compete on quality and service, and explain your value to customers', 'best', 'A price war you cannot afford can sink you. Differentiate.'),
    o('Cut your prices by 40% to win', 'poor', 'You would lose money on every sale.'),
    o('Do nothing at all', 'ok', 'Steady, but watch what your customers do and be ready to act.'),
  ]),
  t('ent-hire', 'entrepreneur', 'Hiring', 'You need a sales person. Your cousin wants the job but has no experience; another candidate has three years in sales.', [
    o('Interview both fairly and hire the best fit', 'best', 'Fair hiring builds a strong team.'),
    o('Hire your cousin because family comes first', 'poor', 'Favouritism can hurt the business and the team.'),
    o('Hire the experienced candidate without interviewing your cousin', 'ok', 'Probably the right hire, but a fair process matters too.'),
  ]),
  // Athlete
  t('ath-injury', 'athlete', 'A sore hamstring', 'Your hamstring feels tight the day before an important match.', [
    o('Tell the physio and follow their advice', 'best', 'Playing on an injury can turn a small strain into months out.'),
    o('Say nothing and play', 'poor', 'Hiding injuries is how careers get shortened.'),
    o('Skip training and hope it heals', 'ok', 'Rest helps, but a physio can tell you what it really is.'),
  ]),
  t('ath-diet', 'athlete', 'Match-day food', 'Your match is at 3 pm. What do you eat at noon?', [
    o('A meal of rice or pasta, some lean protein and water', 'best', 'Carbohydrates for energy, eaten three hours before, with water.'),
    o('Nothing, to feel light', 'poor', 'You will run out of energy in the second half.'),
    o('A big plate of fried food', 'poor', 'Heavy and slow to digest.'),
  ]),
  t('ath-loss', 'athlete', 'After a loss', 'Your team lost and fans are criticising you online.', [
    o('Review the match with your coach and focus on the next game', 'best', 'Learn from it and move on; do not feed the noise.'),
    o('Reply to the critics', 'poor', 'Arguments online rarely end well.'),
    o('Stop reading social media for a while', 'ok', 'Protects your head, but still review your performance.'),
  ]),
  // Pilot
  t('pil-weather', 'pilot', 'Storm ahead', 'Thunderstorms are building on your route. Air traffic control offers a 40-minute diversion around them.', [
    o('Accept the diversion and tell the passengers', 'best', 'Safety first: never fly into thunderstorms.'),
    o('Fly through to stay on time', 'poor', 'Thunderstorms can cause severe turbulence and damage. Never worth it.'),
    o('Turn back to the departure airport', 'ok', 'Safe, but a diversion gets everyone there.'),
  ]),
  t('pil-checklist', 'pilot', 'Running late', 'The flight is 20 minutes late and the first officer suggests skipping parts of the checklist.', [
    o('Complete every item of the checklist', 'best', 'Checklists exist because memory fails under pressure.'),
    o('Skip the "obvious" items to save time', 'poor', 'Skipped checks are behind many accidents.'),
    o('Do the checklist quickly from memory', 'poor', 'From memory is exactly what checklists replace.'),
  ]),
  t('pil-fatigue', 'pilot', 'Feeling tired', 'You slept badly and feel very tired before an early flight.', [
    o('Report that you are not fit to fly so a standby pilot can take over', 'best', 'Fatigue is a safety risk. Reporting it is the professional thing to do.'),
    o('Drink extra coffee and fly', 'poor', 'Caffeine does not fix fatigue.'),
    o('Fly and let the first officer do most of the work', 'poor', 'You are still responsible, and the crew is weaker.'),
  ]),
];

export const tasksFor = (career: Career) => WORK_TASKS.filter((x) => x.career === career);
export const taskById = (id: string) => WORK_TASKS.find((x) => x.id === id);

/** The task offered in a given game hour: rotates through the career's tasks. */
export function taskForHour(career: Career, totalMinutes: number): WorkTask | null {
  const list = tasksFor(career);
  if (list.length === 0) return null;
  return list[Math.floor(totalMinutes / 60) % list.length];
}
