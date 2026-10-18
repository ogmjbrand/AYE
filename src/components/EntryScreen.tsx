import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Character } from './CharacterCreation';
import { CharacterPreview } from './CharacterPreview';
import { resolveStyles } from '../lib/fashion';
import { genderLabel } from '../lib/identity';
import { CAREER_LABEL, LIFESTYLE_LABEL } from '../lib/labels';
import { formatHome } from '../lib/places';
import { DISTRICTS } from '../lib/geography';
import { QUALITY_MODES, type QualityMode } from '../lib/settings';
import { UserRound } from 'lucide-react';
import { CloudAccountPanel } from './CloudAccountPanel';

interface EntryScreenProps {
  /** The life saved on this device, if any. */
  saved: Character | null;
  quality: QualityMode;
  onQualityChange: (quality: QualityMode) => void;
  onContinue: () => void;
  onNewLife: () => void;
}

type Panel = 'menu' | 'confirm-new' | 'help' | 'settings' | 'account';

const QUALITY_INFO: Record<QualityMode, { label: string; detail: string }> = {
  auto: { label: 'Automatic', detail: 'Starts on High and switches to Low if the frame rate drops. Recommended.' },
  high: { label: 'High', detail: 'Ambient occlusion, soft contact shadows and sharper shadows. Needs a capable graphics chip.' },
  low: { label: 'Low', detail: 'Fewer effects and a lower resolution, for laptops with integrated graphics and phones.' },
};

const PRIMARY =
  'w-full rounded-lg bg-cc-gold px-4 py-3 font-display font-bold tracking-wide text-cc-bg transition hover:bg-cc-gold-strong ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cc-gold-strong';
const SECONDARY =
  'w-full rounded-lg border border-cc-line px-4 py-3 font-display font-semibold text-cc-ink transition hover:border-cc-gold ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cc-gold';
const LINK =
  'rounded px-1 text-sm text-cc-muted transition hover:text-cc-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold';

/**
 * The first thing a player sees: the AYE mark, Continue or start a new life,
 * how to play and settings. Saving is per device for now, and the screen says so.
 */
export function EntryScreen({ saved, quality, onQualityChange, onContinue, onNewLife }: EntryScreenProps) {
  const [panel, setPanel] = useState<Panel>('menu');
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to each panel's heading so keyboard and screen-reader users follow the change
  useEffect(() => {
    if (panel !== 'menu') headingRef.current?.focus();
  }, [panel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel('menu'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const startNew = () => (saved ? setPanel('confirm-new') : onNewLife());

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-cc-bg text-cc-ink"
      style={{ backgroundImage: 'radial-gradient(900px 600px at 30% 20%, rgba(201,164,92,0.10), transparent 60%), radial-gradient(800px 500px at 85% 90%, rgba(138,180,216,0.06), transparent 60%)' }}
    >
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-4 py-8 sm:px-8 sm:py-12">
        <div className={`grid flex-1 items-center gap-8 ${saved ? 'lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12' : 'justify-items-center'}`}>
          <main className="w-full max-w-[26rem]">
            <div className="flex flex-col items-center text-center">
              <img
                src={`${import.meta.env.BASE_URL}assets/brand/aye-mark.webp`}
                alt="AYE"
                width={640}
                height={571}
                className="h-auto w-44 drop-shadow-[0_12px_40px_rgba(0,0,0,0.6)] sm:w-56"
              />
              <p className="mt-4 text-balance font-display text-sm font-semibold uppercase tracking-[0.28em] text-cc-ink">Your life. Your choices. Your world.</p>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-cc-muted">Reality in game form</p>
            </div>

            <section className="mt-8 rounded-2xl border border-cc-line bg-cc-panel/90 p-5 shadow-2xl shadow-black/40 sm:p-6" aria-live="polite">
              {panel === 'menu' && (
                <div className="grid gap-3">
                  <h1 className="sr-only">AYE</h1>
                  {saved && (
                    <button type="button" onClick={onContinue} className={PRIMARY}>
                      Continue as {saved.name}
                    </button>
                  )}
                  <button type="button" onClick={startNew} className={saved ? SECONDARY : PRIMARY}>
                    Start a new life
                  </button>
                  <button type="button" onClick={() => setPanel('account')} className={`${SECONDARY} inline-flex items-center justify-center gap-2`}>
                    <UserRound size={17} aria-hidden="true" />
                    AYE Connect account
                  </button>
                  <div className="mt-1 flex justify-center gap-4">
                    <button type="button" onClick={() => setPanel('help')} className={LINK}>How to play</button>
                    <button type="button" onClick={() => setPanel('settings')} className={LINK}>Settings</button>
                  </div>
                </div>
              )}

              {panel === 'confirm-new' && saved && (
                <PanelBody title="Start a new life?" headingRef={headingRef}>
                  <p className="text-sm text-cc-muted">
                    This device holds one life at a time. When you create a new character, <span className="text-cc-ink">{saved.name}</span>'s
                    life (money, clothes and progress) is replaced. Going back before you finish keeps {saved.name}.
                  </p>
                  <div className="mt-5 grid gap-3">
                    <button type="button" onClick={onNewLife} className={PRIMARY}>Create a new character</button>
                    <button type="button" onClick={() => setPanel('menu')} className={SECONDARY}>Keep {saved.name}</button>
                  </div>
                </PanelBody>
              )}

              {panel === 'help' && (
                <PanelBody title="How to play" headingRef={headingRef} onBack={() => setPanel('menu')}>
                  <p className="text-sm text-cc-muted">
                    Your life starts in {DISTRICTS[0].name}, {DISTRICTS[0].city.name}. Work, eat, dress and rest; the clock keeps moving and your bills come every hour. Travel desks fly or drive you to {DISTRICTS.length - 1} other cities: the capital of every country, and every state capital in Nigeria.
                  </p>
                  <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    <Key k="Click">Click or tap the ground to go there; you find your own way round (Shift-click to stroll)</Key>
                    <Key k="W / S">Move forward / back</Key>
                    <Key k="A / D">Turn</Key>
                    <Key k="Shift">Hold to walk instead of jog</Key>
                    <Key k="E">Use what's in front of you: food stalls, the Fashion House, front doors, the Gadget Hub, people</Key>
                    <Key k="M">Phone map (once you own a smartphone)</Key>
                    <Key k="Mouse">Drag to look around, scroll to zoom</Key>
                    <Key k="Phone">Thumb stick bottom-left; drag the scene to look</Key>
                  </dl>
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-cc-muted">
                    <li>Go to your workplace (the glowing ring) between 09:00 and 17:00 to earn wages. Once an hour, press E there for a task from your job: good calls earn a bonus and speed up promotion.</li>
                    <li>Eat before you get hungry: hungry work pays half.</li>
                    <li>Get to know the residents. They are computer-controlled, never other players. Close friends will put you up for the night, and friends will come out with you to the lounge in the evening.</li>
                    <li>The ⋯ button lists every place in the city by category and walks you there. Sit on a park bench to let time pass, e.g. until the lounge opens.</li>
                    <li>Rent a home at a door with a “To let” board. Rent is due each night; sleeping anywhere else is sleeping rough.</li>
                    <li>Rest sleeps until 07:00 and shows how your day went.</li>
                  </ul>
                </PanelBody>
              )}

              {panel === 'account' && (
                <CloudAccountPanel onBack={() => setPanel('menu')} headingRef={headingRef} />
              )}

              {panel === 'settings' && (
                <PanelBody title="Settings" headingRef={headingRef} onBack={() => setPanel('menu')}>
                  <fieldset>
                    <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-cc-gold">Graphics quality</legend>
                    <div className="mt-3 grid gap-2">
                      {QUALITY_MODES.map((m) => (
                        <label
                          key={m}
                          className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cc-gold ${quality === m ? 'border-cc-gold bg-cc-gold/10' : 'border-cc-line hover:border-cc-muted'}`}
                        >
                          <input type="radio" name="quality" value={m} checked={quality === m} onChange={() => onQualityChange(m)} className="mt-1 accent-[#c9a45c]" />
                          <span>
                            <span className="block text-sm font-medium text-cc-ink">{QUALITY_INFO[m].label}</span>
                            <span className="block text-xs text-cc-muted">{QUALITY_INFO[m].detail}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <p className="mt-4 text-xs text-cc-muted">You can also switch quality in the game from the top bar. Your choice is remembered on this device.</p>
                </PanelBody>
              )}
            </section>
          </main>

          {saved && (
            <aside className="relative hidden h-[min(70dvh,40rem)] overflow-hidden rounded-2xl border border-cc-line bg-gradient-to-b from-cc-panel to-cc-bg lg:block" aria-label={`${saved.name}, your saved character`}>
              <CharacterPreview
                outfitColor={`rgb(${saved.colorR}, ${saved.colorG}, ${saved.colorB})`}
                lookId={saved.lookId}
                heightCm={saved.heightCm}
                styles={resolveStyles(saved.wardrobe.equipped)}
                shape={saved.shape}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-cc-bg/95 to-transparent p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cc-gold">Welcome back</p>
                <p className="mt-1 truncate font-display text-3xl font-bold">{saved.name}</p>
                <p className="text-sm text-cc-muted">
                  {formatHome(saved.country, saved.region)} · {CAREER_LABEL[saved.career]} · {LIFESTYLE_LABEL[saved.lifestyle]} · {genderLabel(saved.gender)}
                </p>
              </div>
            </aside>
          )}
        </div>

        <footer className="mt-10 text-center text-xs text-cc-muted">
          Early build · Your life is saved in this browser only; online accounts are coming · In-game money (ⓒ) is virtual and has no cash value
        </footer>
      </div>
    </div>
  );
}

function PanelBody({ title, headingRef, onBack, children }: {
  title: string; headingRef: React.RefObject<HTMLHeadingElement | null>; onBack?: () => void; children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-xl font-semibold outline-none">{title}</h1>
        {onBack && <button type="button" onClick={onBack} className={LINK}>← Back</button>}
      </div>
      {children}
    </div>
  );
}

function Key({ k, children }: { k: string; children: ReactNode }) {
  return (
    <>
      <dt><kbd className="rounded border border-cc-line bg-cc-field px-1.5 py-0.5 font-sans text-xs text-cc-ink">{k}</kbd></dt>
      <dd className="text-cc-muted">{children}</dd>
    </>
  );
}
