import { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  BRIEFING_MINUTES,
  HOSPITAL_PATIENTS_PER_SHIFT,
  PATIENT_MINUTES,
  TRIAGE_CASES,
  diagnosisAccuracy,
  nextPatientIndex,
  type HospitalState,
} from '../lib/hospital';
import { formatGameTime, type GameTime } from '../lib/gameState';

export type HospitalPanelMode = 'reception' | 'patient' | 'supervisor' | 'pharmacy';

interface HospitalPanelProps {
  mode: HospitalPanelMode;
  hospital: HospitalState;
  time: GameTime;
  day: number;
  hourlyPay: number;
  todayIncome: number;
  onClockIn: () => void;
  onClockOut: () => void;
  onBrief: () => void;
  onAnswer: (choice: number) => void;
  onClose: () => void;
}

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-ui-accent bg-ui-accent px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent';
const secondaryClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-ui-line px-4 py-2 text-left text-sm font-semibold text-ui-ink transition active:scale-[0.98] hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent';

const TITLES: Record<HospitalPanelMode, string> = {
  reception: 'Hospital reception',
  patient: 'Ward patient',
  supervisor: 'Supervisor',
  pharmacy: 'Pharmacy',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ui-line p-3">
      <p className="m-0 text-xs uppercase tracking-[0.12em] text-ui-muted">{label}</p>
      <p className="m-0 mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

export function HospitalPanel({ mode, hospital, time, day, hourlyPay, todayIncome, onClockIn, onClockOut, onBrief, onAnswer, onClose }: HospitalPanelProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const accuracy = diagnosisAccuracy(hospital);
  const patientIndex = nextPatientIndex(hospital, day);
  const triage = patientIndex === null ? null : TRIAGE_CASES[patientIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-3 sm:items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hospital-panel-title"
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-ui-line bg-ui-panel p-5 text-ui-ink shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
              General Hospital · {formatGameTime(time)}
            </p>
            <h2 id="hospital-panel-title" className="m-0 mt-1 font-display text-2xl font-bold">{TITLES[mode]}</h2>
          </div>
          <button type="button" className={secondaryClass} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        {mode === 'reception' && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Status" value={hospital.onShift ? 'On shift' : 'Off shift'} />
              <Stat label="Patients today" value={`${hospital.patientsToday} / ${HOSPITAL_PATIENTS_PER_SHIFT}`} />
              <Stat label="Pay rate" value={`${hourlyPay} ⓒ / hour`} />
              <Stat label="Earned today" value={`${todayIncome.toLocaleString()} ⓒ`} />
              <Stat label="Shifts completed" value={String(hospital.shiftsCompleted)} />
              <Stat label="Diagnosis accuracy" value={accuracy === null ? 'None yet' : `${accuracy}%`} />
            </div>
            <p className="m-0 text-sm text-ui-muted">
              Clock in between 09:00 and 15:00, get your briefing from the supervisor, then treat {HOSPITAL_PATIENTS_PER_SHIFT} patients on the ward.
              You are paid your normal hourly wage for time on shift.
            </p>
            {hospital.onShift ? (
              <button type="button" className={buttonClass} onClick={onClockOut}>
                Clock out{hospital.patientsToday >= HOSPITAL_PATIENTS_PER_SHIFT ? ' (shift complete)' : ' (shift incomplete)'}
              </button>
            ) : (
              <button type="button" className={buttonClass} onClick={onClockIn}>Clock in</button>
            )}
          </div>
        )}

        {mode === 'supervisor' && (
          <div className="grid gap-4">
            {!hospital.onShift ? (
              <p className="m-0 text-sm text-ui-muted">Clock in at reception first. The supervisor briefs doctors who are on shift.</p>
            ) : hospital.briefed ? (
              <p className="m-0 text-sm text-ui-muted">You have been briefed. Head to the ward and see your patients.</p>
            ) : (
              <>
                <p className="m-0 text-sm text-ui-muted">
                  &ldquo;Four patients are waiting on the ward. Triage carefully: red-flag symptoms come first.&rdquo; ({BRIEFING_MINUTES} min)
                </p>
                <button type="button" className={buttonClass} onClick={onBrief}>Take the briefing</button>
              </>
            )}
          </div>
        )}

        {mode === 'patient' && (
          !hospital.onShift ? (
            <p className="m-0 text-sm text-ui-muted">Clock in at reception before seeing patients.</p>
          ) : !hospital.briefed ? (
            <p className="m-0 text-sm text-ui-muted">Get your briefing from the supervisor before seeing patients.</p>
          ) : !triage ? (
            <p className="m-0 text-sm text-ui-muted">All of today&apos;s patients have been seen. Clock out at reception.</p>
          ) : (
            <div className="grid gap-3">
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-ui-muted">
                Patient {hospital.patientsToday + 1} of {HOSPITAL_PATIENTS_PER_SHIFT} · {triage.patient} · {PATIENT_MINUTES} min
              </p>
              <p className="m-0 font-semibold">{triage.complaint}</p>
              {triage.options.map((option, index) => (
                <button key={option} type="button" className={secondaryClass} onClick={() => onAnswer(index)}>
                  {option}
                </button>
              ))}
            </div>
          )
        )}

        {mode === 'pharmacy' && (
          <p className="m-0 text-sm text-ui-muted">
            The ward pharmacy is stocked by the hospital. You do not pay for supplies; treatments are covered by your shift.
          </p>
        )}
      </section>
    </div>
  );
}
