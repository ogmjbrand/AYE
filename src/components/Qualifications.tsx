import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import type { Career } from './CharacterCreation';
import {
  PASS_MARK, STUDY_SESSION_MINUTES, canEnrol, canSitExam, canStudy, hasQualification, qualificationsFor, score, type Qualification, type Qualifications as Quals,
} from '../lib/qualifications';
import { careerLadder } from '../lib/progression';
import { gearFor } from '../lib/careerGear';
import { ConfirmRow } from './WorkGear';

const SMALL_GOLD = 'shrink-0 rounded-lg bg-gradient-to-b from-[#e8b452] via-[#d79d3c] to-[#c88a2c] px-3 py-1.5 text-xs font-bold text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0c67e]';
const SMALL_DARK = 'shrink-0 rounded-lg border border-ui-gold/40 px-3 py-1.5 text-xs font-semibold hover:border-ui-gold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold';
const money = (n: number) => `${Math.round(n).toLocaleString()} GHAI`;

/** The exam: every question, then a mark. Nothing is shown as right or wrong until you hand it in. */
function Exam({ item, onSubmit, onCancel }: { item: Qualification; onSubmit: (answers: number[]) => void; onCancel: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => item.exam.map(() => null));
  const done = answers.every((a) => a !== null);
  return (
    <div className="mt-2 space-y-3 rounded-xl border border-ui-gold/40 bg-black/40 p-3" role="group" aria-label={`${item.name} exam`}>
      <p className="m-0 text-[11px] text-ui-muted">{item.exam.length} questions · {PASS_MARK} or more to pass · takes half an hour</p>
      {item.exam.map((q, qi) => (
        <fieldset key={qi} className="m-0 border-0 p-0">
          <legend className="mb-1 text-xs font-semibold">{qi + 1}. {q.prompt}</legend>
          <div className="grid gap-1">
            {q.options.map((o, oi) => (
              <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${answers[qi] === oi ? 'border-ui-gold bg-ui-gold/10' : 'border-white/10 hover:border-ui-gold/40'}`}>
                <input type="radio" name={`${item.id}-${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))} className="accent-[#d79d3c]" />
                {o}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-2">
        <button type="button" disabled={!done} onClick={() => onSubmit(answers as number[])} className={SMALL_GOLD}>Hand in</button>
        <button type="button" onClick={onCancel} className={SMALL_DARK}>Not yet</button>
      </div>
    </div>
  );
}

/**
 * Your career's qualifications: enrol (with the fee confirmed), study in
 * hour-long sessions at a study place, sit a real exam, and see what each one
 * unlocks.
 */
export function QualificationsSection({ career, quals, rankIndex, balance, now, atStudyPlace, onEnrol, onStudy, onExam }: {
  career: Career;
  quals: Quals;
  rankIndex: number;
  balance: number;
  now: number;
  atStudyPlace: boolean;
  onEnrol: (id: string) => void;
  onStudy: (id: string) => void;
  onExam: (id: string, answers: number[]) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [sitting, setSitting] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; score: number; passed: boolean } | null>(null);
  const list = qualificationsFor(career);
  if (!list.length) return null;
  const ladder = careerLadder(career);
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {list.map((item) => {
        const held = hasQualification(quals, item.id);
        const enrolled = item.id in quals.enrolled;
        const studied = quals.enrolled[item.id] ?? 0;
        const enrolCheck = canEnrol(quals, item, rankIndex, balance);
        const studyCheck = canStudy(quals, item, atStudyPlace);
        const examCheck = canSitExam(quals, item, now);
        const unlocks = gearFor(career).filter((g) => g.qualification === item.id).map((g) => g.name);
        return (
          <li key={item.id} className="rounded-xl border border-ui-gold/25 bg-[#1a1815] p-3">
            <div className="flex items-start gap-3">
              <GraduationCap size={20} aria-hidden="true" className={`mt-0.5 shrink-0 ${held ? 'text-ui-success' : 'text-ui-gold'}`} />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-sm font-semibold">{item.name} <span className="ml-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ui-muted">{item.kind}</span></p>
                <p className="m-0 mt-0.5 text-xs text-ui-muted">{item.description}</p>
                <p className="m-0 mt-1 text-[11px] text-ui-gold-strong">
                  +{Math.round(item.payBonus * 100)}% pay · {item.studyHours} hours of study · fee {money(item.fee)}{item.rank > 0 ? ` · from ${ladder[item.rank]?.title}` : ''}
                  {unlocks.length > 0 && ` · unlocks ${unlocks.join(', ')}`}
                </p>
              </div>
              {held && <span className="shrink-0 text-xs font-semibold text-ui-success">Qualified</span>}
            </div>
            {!held && !enrolled && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-ui-muted">{enrolCheck.ok ? 'Open for enrolment.' : enrolCheck.reason}</span>
                <button type="button" disabled={!enrolCheck.ok} onClick={() => setConfirming(item.id)} className={SMALL_GOLD}>Enrol</button>
              </div>
            )}
            {confirming === item.id && enrolCheck.ok && (
              <ConfirmRow text={`Enrol on ${item.name} for ${money(item.fee)}?`} amount={-item.fee} balance={balance} onConfirm={() => { onEnrol(item.id); setConfirming(null); }} onCancel={() => setConfirming(null)} />
            )}
            {!held && enrolled && (
              <div className="mt-2">
                <div className="flex justify-between text-[11px] text-ui-muted"><span>Studied</span><span className="tabular-nums">{Math.floor(studied / 60)} of {item.studyHours} hours</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#2a2620]" role="progressbar" aria-label={`${item.name} study`} aria-valuemin={0} aria-valuemax={item.studyHours * 60} aria-valuenow={studied}>
                  <div className="h-full rounded-full bg-gradient-to-r from-[#c88a2c] to-[#f0c67e]" style={{ width: `${Math.min(100, (studied / (item.studyHours * 60)) * 100)}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" disabled={!studyCheck.ok} onClick={() => onStudy(item.id)} className={SMALL_DARK}>Study for {STUDY_SESSION_MINUTES / 60} hour</button>
                  <button type="button" disabled={!examCheck.ok} onClick={() => { setResult(null); setSitting(item.id); }} className={SMALL_GOLD}>Sit the exam</button>
                </div>
                {!studyCheck.ok && studied < item.studyHours * 60 && <p className="m-0 mt-1 text-[11px] text-ui-muted">{studyCheck.reason}</p>}
                {!examCheck.ok && studied >= item.studyHours * 60 && <p className="m-0 mt-1 text-[11px] text-ui-muted">{examCheck.reason}</p>}
              </div>
            )}
            {sitting === item.id && (
              <Exam item={item} onCancel={() => setSitting(null)} onSubmit={(answers) => {
                const s = score(item, answers);
                onExam(item.id, answers);
                setResult({ id: item.id, score: s, passed: s >= PASS_MARK });
                setSitting(null);
              }} />
            )}
            {result?.id === item.id && (
              <p role="status" className={`m-0 mt-2 text-xs font-semibold ${result.passed ? 'text-ui-success' : 'text-ui-warn'}`}>
                {result.score} out of {item.exam.length}. {result.passed ? 'Passed: you’re qualified.' : 'Not this time. Study the material and retake it tomorrow, free.'}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
