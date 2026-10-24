import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { APPS, appById, searchApps, unreadCount, type AppCategory, type AppId, type PhoneNotification } from '../../lib/phone';
import { formatGameTime, DAY_NAMES } from '../../lib/gameState';
import { AppScreen } from './apps';
import { Glyph } from './glyphs';
import { APP_ICON } from './icons';
import { WALLPAPER_CSS, ghai, viewTitle, type AppCtx } from './ui';
import { chime, tick } from './sound';

/** Apps that hand over to one of the game's own full panels instead of a screen on the phone. */
const HANDOVER: Partial<Record<AppId, (ctx: AppCtx) => (() => void) | null>> = {
  maps: (ctx) => ctx.act.openMap,
  travel: (ctx) => ctx.act.openTravel,
  life: (ctx) => ctx.act.openLifeOS,
};
const PER_PAGE = 16;
const CATEGORY_ORDER: readonly AppCategory[] = ['Finance', 'Shopping & property', 'Work & transport', 'Social', 'Health & services', 'Entertainment', 'Utilities'];

export type PhoneProps = Omit<AppCtx, 'view' | 'push' | 'pop' | 'openApp'> & {
  /** Opens straight into this app (from a notification banner). */
  startApp?: AppId | null;
  onClose: () => void;
};

function AppIcon({ id, size = 'h-[52px] w-[52px]', badge }: { id: AppId; size?: string; badge?: number }) {
  const ic = APP_ICON[id];
  return (
    <span className={`relative grid ${size} place-items-center rounded-[14px] text-white shadow-[0_6px_14px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]`} style={{ background: ic.bg }}>
      <Glyph name={ic.glyph} className="h-6 w-6" />
      {!!badge && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#e5484d] px-1 text-[10px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>}
    </span>
  );
}

function Battery({ level, charging }: { level: number; charging: boolean }) {
  const low = level <= 20;
  return (
    <span className="flex items-center gap-1" aria-label={`Battery ${level}%${charging ? ', charging' : ''}`}>
      <span className="tabular-nums">{level}%</span>
      <span className="relative h-[11px] w-[22px] rounded-[3px] border border-white/70 p-[1px]">
        <span className={`block h-full rounded-[1.5px] ${low ? 'bg-[#e5484d]' : charging ? 'bg-ui-accent' : 'bg-white'}`} style={{ width: `${Math.max(6, level)}%` }} />
        <span className="absolute -right-[3px] top-[3px] h-[3px] w-[2px] rounded-r bg-white/70" />
      </span>
      {charging && <Glyph name="energy" className="h-3 w-3 text-ui-accent-strong" />}
    </span>
  );
}

function Signal({ bars }: { bars: number }) {
  return (
    <span className="flex items-end gap-[2px]" aria-label={`Signal ${bars} of 4`}>
      {[1, 2, 3, 4].map((b) => <span key={b} className={`w-[3px] rounded-sm ${b <= bars ? 'bg-white' : 'bg-white/30'}`} style={{ height: 3 + b * 2 }} />)}
    </span>
  );
}

export function Phone(props: PhoneProps) {
  const { phone, setPhone, battery, charging, state, onClose } = props;
  // Which app is on screen, the views inside each (for Back), and the recent apps
  const [app, setApp] = useState<AppId | null>(props.startApp ?? null);
  const [views, setViews] = useState<Partial<Record<AppId, string[]>>>({});
  const [recents, setRecents] = useState<AppId[]>(props.startApp ? [props.startApp] : []);
  const [switcher, setSwitcher] = useState(false);
  const [shade, setShade] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [handoverMsg, setHandoverMsg] = useState<string | null>(null);
  const sound = props.sound && phone.sound;
  const click = () => { if (sound) tick(); };

  const view = app ? views[app]?.[views[app]!.length - 1] ?? null : null;
  const openApp = (id: AppId, inside?: string) => {
    click();
    setShade(false); setSwitcher(false); setQuery('');
    const hand = HANDOVER[id];
    if (hand) {
      const go = hand(ctxBase);
      if (go) { go(); return; }
      setHandoverMsg(id === 'maps' ? 'Maps need the Smartphone upgrade (900 GHAI) from the gadget shop.' : 'Not available right now.');
      return;
    }
    setApp(id);
    if (inside) setViews((vs) => ({ ...vs, [id]: [...(vs[id] ?? []), inside] }));
    setRecents((r) => [id, ...r.filter((x) => x !== id)].slice(0, 6));
  };
  const push = (v: string) => setViews((vs) => { const a = app; if (!a) return vs; return { ...vs, [a]: [...(vs[a] ?? []), v] }; });
  const pop = () => setViews((vs) => (app ? { ...vs, [app]: (vs[app] ?? []).slice(0, -1) } : vs));
  const back = () => {
    click();
    if (shade) { setShade(false); return; }
    if (switcher) { setSwitcher(false); return; }
    if (app && view) { pop(); return; }
    if (app) { setApp(null); return; }
    onClose();
  };
  const home = () => { click(); setApp(null); setShade(false); setSwitcher(false); setQuery(''); };

  // Esc goes back; P closes (App toggles it); the movement keys are blocked by App while the phone is open
  const backRef = useRef(back);
  useEffect(() => { backRef.current = back; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); backRef.current(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (!handoverMsg) return; const id = setTimeout(() => setHandoverMsg(null), 3500); return () => clearTimeout(id); }, [handoverMsg]);

  // A new notification while it's open: the chime
  const unread = unreadCount(phone);
  const lastUnread = useRef(unread);
  useEffect(() => { if (unread > lastUnread.current && sound) chime(); lastUnread.current = unread; }, [unread, sound]);

  // Reading the shade marks everything read; opening an app reads its own
  useEffect(() => {
    if (!app || !phone.inbox.some((n) => n.app === app && !n.read)) return;
    setPhone((p) => ({ ...p, inbox: p.inbox.map((n) => (n.app === app ? { ...n, read: true } : n)) }));
  }, [app, phone.inbox, setPhone]);

  const ctxBase: AppCtx = { ...props, view, push, pop, openApp };
  const pages = useMemo(() => {
    const out: AppId[][] = [];
    for (let i = 0; i < phone.order.length; i += PER_PAGE) out.push(phone.order.slice(i, i + PER_PAGE));
    return out;
  }, [phone.order]);
  const pageCount = pages.length + 1; // the last page is the App Library
  const badgeFor = (id: AppId) => phone.inbox.filter((n) => n.app === id && !n.read).length;
  const results = searchApps(query);
  const dead = battery <= 0;
  const t = state.time;
  
  // Swipe between home pages
  const touch = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touch.current === null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 50) setPage((p) => Math.max(0, Math.min(pageCount - 1, p + (dx < 0 ? 1 : -1))));
  };

  const frame: CSSProperties = { background: WALLPAPER_CSS[phone.wallpaper] };

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:inset-auto sm:bottom-24 sm:right-6 sm:top-6 sm:bg-transparent" role="dialog" aria-label="Your phone" aria-modal="true">
      <div className="phone-rise relative flex h-full w-full flex-col overflow-hidden text-white sm:h-auto sm:max-h-[780px] sm:w-[370px] sm:rounded-[44px] sm:border-[10px] sm:border-[#0b0c0e] sm:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)]" style={frame}>
        {/* Status bar */}
        <button type="button" onClick={() => { click(); setShade((s) => !s); }} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative z-20 flex shrink-0 items-center justify-between px-6 pb-1 pt-3 text-[12px] font-semibold">
          <span className="tabular-nums">{formatGameTime(t)}</span>
          <span className="absolute left-1/2 top-2.5 hidden h-[22px] w-[76px] -translate-x-1/2 rounded-full bg-black sm:block" aria-hidden />
          <span className="flex items-center gap-2">
            {unread > 0 && phone.notifications && <span className="h-2 w-2 rounded-full bg-[#e5484d]" aria-hidden />}
            <span className="text-[10px] font-bold tracking-wide">AYE</span><Signal bars={dead ? 0 : 4} />
            <Battery level={battery} charging={charging} />
          </span>
        </button>

        {dead ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-black px-8 text-center">
            <span className="relative h-8 w-14 rounded-md border-2 border-white/60"><span className="absolute left-0.5 top-0.5 h-[calc(100%-4px)] w-1.5 rounded-sm bg-[#e5484d]" /></span>
            <p className="m-0 text-[14px] font-semibold">Your battery is flat</p>
            <p className="m-0 text-[12px] text-white/60">Go home to charge it. Life OS still opens with L.</p>
            <button type="button" onClick={onClose} className="mt-2 rounded-full bg-white/15 px-4 py-2 text-[12px]">Put it away</button>
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Home screen */}
            {!app && (
              <div className="flex min-h-0 flex-1 flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                <div className="px-5 pb-2 pt-1 text-center">
                  <p className="m-0 font-display text-[36px] font-light leading-none tabular-nums">{formatGameTime(t)}</p>
                  <p className="m-0 mt-1 text-[12px] text-white/80">{DAY_NAMES[t.dayOfWeek]} · {props.district.city.name}</p>
                  <button type="button" onClick={() => openApp('wallet')} className="mx-auto mt-2 flex items-center gap-2 rounded-full bg-black/35 px-4 py-1 text-[13px] font-semibold backdrop-blur">
                    <Glyph name="coin" className="h-4 w-4 text-ui-gold-strong" />{ghai(state.balance)}
                  </button>
                </div>
                <label className="mx-5 mb-2 flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2 backdrop-blur">
                  <Glyph name="search" className="h-4 w-4 text-white/70" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search apps" aria-label="Search apps" className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/55" />
                  {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Glyph name="close" className="h-4 w-4" /></button>}
                </label>
                {query ? (
                  <div className="min-h-0 flex-1 overflow-y-auto px-5">
                    {results.length === 0 && <p className="mt-4 text-center text-[12px] text-white/60">No apps match “{query}”.</p>}
                    {results.map((a) => (
                      <button key={a.id} type="button" onClick={() => openApp(a.id)} className="mb-1.5 flex w-full items-center gap-3 rounded-2xl bg-black/30 p-2 text-left backdrop-blur hover:bg-black/40">
                        <AppIcon id={a.id} size="h-10 w-10" />
                        <span><span className="block text-[13px] font-semibold">{a.name}</span><span className="block text-[11px] text-white/65">{a.blurb}</span></span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${page * 100}%)` }}>
                      {pages.map((ids, i) => (
                        <div key={i} className="grid h-full w-full shrink-0 grid-cols-4 content-start gap-x-2 gap-y-3 overflow-y-auto px-5 pt-1" aria-hidden={i !== page}>
                          {ids.map((id) => (
                            <button key={id} type="button" onClick={() => openApp(id)} tabIndex={i === page ? 0 : -1} className="flex flex-col items-center gap-1 transition active:scale-90">
                              <AppIcon id={id} badge={phone.notifications ? badgeFor(id) : 0} />
                              <span className="w-full truncate text-center text-[10.5px] font-medium drop-shadow">{appById(id)!.name}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                      {/* App Library: every app by category */}
                      <div className="h-full w-full shrink-0 overflow-y-auto px-4 pt-1" aria-hidden={page !== pageCount - 1}>
                        <p className="m-0 mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-white/70">App Library</p>
                        <div className="grid grid-cols-2 gap-2.5 pb-2">
                          {CATEGORY_ORDER.map((c) => {
                            const ids = APPS.filter((a) => a.category === c).map((a) => a.id);
                            return (
                              <div key={c} className="rounded-2xl bg-black/30 p-2 backdrop-blur">
                                <div className="grid grid-cols-2 gap-1.5">
                                  {ids.map((id) => <button key={id} type="button" onClick={() => openApp(id)} tabIndex={page === pageCount - 1 ? 0 : -1} aria-label={appById(id)!.name} className="grid place-items-center transition active:scale-90"><AppIcon id={id} size="h-10 w-10" /></button>)}
                                </div>
                                <p className="m-0 mt-1.5 text-center text-[10px] font-medium text-white/80">{c}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!query && (
                  <div className="flex justify-center gap-1.5 py-2" role="tablist" aria-label="Home screen pages">
                    {Array.from({ length: pageCount }, (_, i) => (
                      <button key={i} type="button" role="tab" aria-selected={i === page} aria-label={i === pageCount - 1 ? 'App Library' : `Page ${i + 1}`} onClick={() => setPage(i)} className={`h-1.5 rounded-full transition-all ${i === page ? 'w-4 bg-white' : 'w-1.5 bg-white/45'}`} />
                    ))}
                  </div>
                )}
                {/* Dock */}
                <div className="mx-3 mb-2 flex justify-around rounded-[28px] bg-white/15 px-2 py-2 backdrop-blur-md">
                  {phone.dock.map((id) => (
                    <button key={id} type="button" onClick={() => openApp(id)} aria-label={appById(id)!.name} className="transition active:scale-90"><AppIcon id={id} badge={phone.notifications ? badgeFor(id) : 0} /></button>
                  ))}
                </div>
              </div>
            )}

            {/* An app */}
            {app && (
              <div key={app} className="phone-open flex min-h-0 flex-1 flex-col bg-[#0e1012]/95">
                <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-1">
                  <button type="button" onClick={back} aria-label="Back" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"><Glyph name="back" className="h-5 w-5" /></button>
                  <h2 className="m-0 min-w-0 flex-1 truncate font-display text-[17px] font-semibold">{viewTitle(app, view)}</h2>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                  <AppScreen id={app} ctx={ctxBase} />
                </div>
              </div>
            )}

            {/* Notification centre */}
            {shade && <Shade inbox={phone.inbox} onOpen={(n) => openApp(n.app)} onClear={() => setPhone((p) => ({ ...p, inbox: [] }))} onReadAll={() => setPhone((p) => ({ ...p, inbox: p.inbox.map((n) => ({ ...n, read: true })) }))} enabled={phone.notifications} now={t.totalMinutes} />}

            {/* Recent apps */}
            {switcher && (
              <div className="absolute inset-0 z-30 flex flex-col bg-black/70 p-4 backdrop-blur-md">
                <p className="m-0 mb-3 text-center text-[12px] font-semibold uppercase tracking-wider text-white/70">Recent apps</p>
                {recents.length === 0 && <p className="text-center text-[12px] text-white/60">No apps open.</p>}
                <div className="flex flex-col gap-2 overflow-y-auto">
                  {recents.map((id) => (
                    <div key={id} className="flex items-center gap-3 rounded-2xl bg-white/10 p-2.5">
                      <button type="button" onClick={() => openApp(id)} className="flex flex-1 items-center gap-3 text-left"><AppIcon id={id} size="h-10 w-10" /><span className="text-[13px] font-semibold">{appById(id)!.name}</span></button>
                      <button type="button" aria-label={`Close ${appById(id)!.name}`} onClick={() => { setRecents((r) => r.filter((x) => x !== id)); setViews((vs) => ({ ...vs, [id]: [] })); if (app === id) setApp(null); }} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15"><Glyph name="close" className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {handoverMsg && <p role="status" className="absolute inset-x-4 bottom-20 z-40 m-0 rounded-2xl bg-black/80 px-4 py-3 text-center text-[12px]">{handoverMsg}</p>}

            {/* Navigation bar: back, home, recents */}
            <div className="flex shrink-0 items-center justify-around border-t border-white/10 bg-black/45 py-1.5 backdrop-blur-md">
              <button type="button" onClick={back} aria-label="Back" className="grid h-9 w-14 place-items-center rounded-full hover:bg-white/10"><Glyph name="back" className="h-5 w-5" /></button>
              <button type="button" onClick={home} aria-label="Home" className="grid h-9 w-14 place-items-center rounded-full hover:bg-white/10"><span className="h-4 w-4 rounded-full border-2 border-white" /></button>
              <button type="button" onClick={() => { click(); setShade(false); setSwitcher((s) => !s); }} aria-label="Recent apps" aria-pressed={switcher} className="grid h-9 w-14 place-items-center rounded-full hover:bg-white/10"><span className="h-3.5 w-3.5 rounded-[3px] border-2 border-white" /></button>
            </div>
          </div>
        )}
        {!app && <button type="button" onClick={onClose} aria-label="Put the phone away" className="absolute right-3 top-10 z-30 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white/80 hover:text-white sm:-right-0 sm:top-11">
          <Glyph name="close" className="h-4 w-4" />
        </button>}
      </div>
    </div>
  );
}

function Shade({ inbox, onOpen, onClear, onReadAll, enabled, now }: { inbox: readonly PhoneNotification[]; onOpen: (n: PhoneNotification) => void; onClear: () => void; onReadAll: () => void; enabled: boolean; now: number }) {
  useEffect(() => { onReadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const items = [...inbox].reverse();
  return (
    <div className="phone-shade absolute inset-0 z-30 flex flex-col bg-black/75 px-3 pt-2 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="m-0 font-display text-[17px] font-semibold">Notifications</p>
        {items.length > 0 && <button type="button" onClick={onClear} className="rounded-full bg-white/15 px-3 py-1 text-[11px]">Clear all</button>}
      </div>
      {!enabled && <p className="m-0 mb-2 px-1 text-[11px] text-white/60">Notifications are off (Settings).</p>}
      {items.length === 0 && <p className="mt-10 text-center text-[12px] text-white/55">No notifications.</p>}
      <div className="flex flex-col gap-2 overflow-y-auto pb-3">
        {items.map((n) => (
          <button key={n.id} type="button" onClick={() => onOpen(n)} className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 text-left hover:bg-white/15">
            <AppIcon id={n.app} size="h-8 w-8" />
            <span className="min-w-0 flex-1">
              <span className="flex justify-between gap-2 text-[11px] text-white/60"><span>{appById(n.app)?.name}</span><span>{ago(n.t, now)}</span></span>
              <span className="block text-[13px] font-semibold">{n.title}</span>
              <span className="block text-[12px] leading-snug text-white/75">{n.body}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ago(t: number, now: number) {
  const m = Math.max(0, now - t);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

/** The alert that slides in at the top of the screen while the phone is in your pocket. */
export function PhoneBanner({ n, onOpen, onDismiss }: { n: PhoneNotification; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div className="phone-banner pointer-events-auto fixed left-1/2 top-3 z-50 flex w-[min(92vw,360px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-[#15181a]/90 p-2.5 text-white shadow-2xl backdrop-blur-xl" role="status">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <AppIcon id={n.app} size="h-9 w-9" />
        <span className="min-w-0">
          <span className="block text-[11px] text-white/60">{appById(n.app)?.name} · now</span>
          <span className="block truncate text-[13px] font-semibold">{n.title}</span>
          <span className="block truncate text-[12px] text-white/75">{n.body}</span>
        </span>
      </button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/10"><Glyph name="close" className="h-4 w-4" /></button>
    </div>
  );
}
