import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { OwnedVehicle, VehicleCategory, VehicleListing } from '../lib/vehicleCatalog';
import { VEHICLE_CATALOG, vehicleColourById } from '../lib/vehicleCatalog';
import { Car } from '../world/Props';

interface DealershipPanelProps {
  balance: number;
  purchasePaused?: boolean;
  ownedVehicles: readonly OwnedVehicle[];
  initialModelId?: string;
  onBuy: (modelId: string, colour: string) => void;
  onPaint: (modelId: string, colour: string) => void;
  onSpawn: (modelId: string) => boolean;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<VehicleCategory, string> = {
  economy: 'Economy',
  sedan: 'Sedan',
  suv: 'SUV',
  luxury: 'Luxury',
  sports: 'Sports',
  pickup: 'Pickup',
};

function VehiclePreview({ vehicle, colour }: { vehicle: VehicleListing; colour: string }) {
  const turntable = useRef<Group>(null);
  useFrame((_, delta) => {
    if (turntable.current) turntable.current.rotation.y += delta * 0.24;
  });
  return (
    <group ref={turntable}>
      <Car vehicle={{
        position: [0, 0, 0],
        heading: 0,
        color: colour,
        kind: 'car',
        bodyStyle: vehicle.bodyStyle,
      }} />
    </group>
  );
}

export function DealershipPanel({ balance, purchasePaused = false, ownedVehicles, initialModelId, onBuy, onPaint, onSpawn, onClose }: DealershipPanelProps) {
  const [tab, setTab] = useState<'showroom' | 'garage'>('showroom');
  const [selectedId, setSelectedId] = useState(
    () => VEHICLE_CATALOG.find((vehicle) => vehicle.id === initialModelId)?.id ?? VEHICLE_CATALOG[0].id,
  );
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedColourId, setSelectedColourId] = useState(VEHICLE_CATALOG[0].colours[0]);
  const [message, setMessage] = useState<string | null>(null);
  const selected = VEHICLE_CATALOG.find((vehicle) => vehicle.id === selectedId) ?? VEHICLE_CATALOG[0];
  const owned = ownedVehicles.find((vehicle) => vehicle.modelId === selected.id);
  const selectedColour = owned
    ? vehicleColourById(owned.colour)
    : vehicleColourById(selected.colours.includes(selectedColourId) ? selectedColourId : selected.colours[0]);
  const listings = tab === 'garage'
    ? VEHICLE_CATALOG.filter((vehicle) => ownedVehicles.some((item) => item.modelId === vehicle.id))
    : VEHICLE_CATALOG;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const buySelected = () => {
    if (purchasePaused) {
      setMessage('Purchases are unavailable while you review the daily summary.');
      return;
    }
    if (owned) {
      setMessage('This model is already in your garage.');
      return;
    }
    if (balance < selected.price) {
      setMessage(`You need ${(selected.price - balance).toLocaleString()} more GHAI for this car.`);
      setConfirmId(null);
      return;
    }
    if (confirmId !== selected.id) {
      setConfirmId(selected.id);
      setMessage(`Confirm the ${selected.name} purchase for ${selected.price.toLocaleString()} GHAI.`);
      return;
    }
    onBuy(selected.id, selectedColour?.id ?? selected.colours[0]);
    setConfirmId(null);
    setMessage(`${selected.name} was added to your garage.`);
  };

  const takeOut = () => {
    if (onSpawn(selected.id)) setMessage(`${selected.name} is ready outside. W/S accelerate or reverse; A/D steer; E exits.`);
    else setMessage('There is no clear vehicle space at the dealership. Try again in a moment.');
  };

  const choose = (vehicle: VehicleListing) => {
    setSelectedId(vehicle.id);
    setMessage(null);
    setConfirmId(null);
    setSelectedColourId(vehicle.colours[0]);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-5" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dealership-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-ui-line bg-[#171a1b] text-ui-ink shadow-[0_24px_90px_rgba(0,0,0,0.6)] sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line/80 px-5 py-4 sm:px-7">
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-ui-accent-strong">Marina Boulevard · Lagos</p>
            <h2 id="dealership-title" className="m-0 mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">Marina Motors</h2>
            <p className="m-0 mt-1 text-xs text-ui-muted">Available balance <strong className="tabular-nums text-ui-ink">{balance.toLocaleString()} GHAI</strong></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-ui-line px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ui-muted transition hover:border-ui-accent hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">
            Close
          </button>
        </header>
        <nav aria-label="Dealership sections" className="flex gap-2 border-b border-ui-line/70 px-5 py-3 sm:px-7">
          {(['showroom', 'garage'] as const).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => {
                setTab(section);
                setMessage(null);
                if (section === 'garage' && !ownedVehicles.some((vehicle) => vehicle.modelId === selected.id)) {
                  const firstOwned = ownedVehicles[0];
                  if (firstOwned) setSelectedId(firstOwned.modelId);
                }
              }}
              aria-pressed={tab === section}
              className={`border-b-2 px-1 pb-2 text-xs font-semibold uppercase tracking-[0.14em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent ${tab === section ? 'border-ui-accent text-ui-accent-strong' : 'border-transparent text-ui-muted hover:text-ui-ink'}`}
            >
              {section === 'showroom' ? 'Showroom' : `Garage · ${ownedVehicles.length}`}
            </button>
          ))}
        </nav>
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.78fr)]">
          <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-7">
            {listings.length === 0 ? (
              <div className="flex min-h-48 flex-col justify-center">
                <p className="m-0 text-sm font-semibold">Your garage is empty.</p>
                <p className="mb-0 mt-1 max-w-md text-sm leading-relaxed text-ui-muted">Browse the showroom to choose a car. Each model can be purchased once and remains saved with its paint colour.</p>
                <button type="button" onClick={() => setTab('showroom')} className="mt-5 w-fit rounded-lg border border-ui-accent/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ui-accent-strong transition hover:bg-ui-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Browse cars</button>
              </div>
            ) : (
              <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
                {listings.map((vehicle) => {
                  const isOwned = ownedVehicles.some((item) => item.modelId === vehicle.id);
                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => choose(vehicle)}
                      aria-pressed={vehicle.id === selected.id}
                      className={`group border-b border-ui-line/60 py-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent ${vehicle.id === selected.id ? 'border-ui-accent/70' : 'hover:border-ui-accent/40'}`}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-lg font-semibold tracking-tight">{vehicle.name}</span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-ui-muted">{CATEGORY_LABEL[vehicle.category]}</span>
                      </span>
                      <span className="mt-1 block text-sm tabular-nums text-ui-accent-strong">{vehicle.price.toLocaleString()} GHAI</span>
                      <span className="mt-2 block text-[11px] leading-relaxed text-ui-muted tabular-nums">{vehicle.topSpeedKph} km/h · 0–100 in {vehicle.accelerationSeconds}s · {vehicle.seats} seats</span>
                      <span className={`mt-2 inline-block text-[10px] font-semibold uppercase tracking-[0.14em] ${isOwned ? 'text-ui-accent-strong' : 'text-ui-muted'}`}>{isOwned ? 'In your garage' : 'Available'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <aside className="flex min-h-0 flex-col border-t border-ui-line/70 bg-[#202425] px-5 py-4 sm:px-7 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-ui-muted">Vehicle preview</p>
              <span className="text-[10px] uppercase tracking-wider text-ui-accent-strong">Stylised fallback model</span>
            </div>
            <div className="h-36 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(ellipse_at_50%_70%,#414747_0%,#222627_55%,#1b1f20_100%)] sm:h-40">
              <Canvas camera={{ position: [5.5, 3.4, 6.2], fov: 38 }} dpr={[1, 1.25]} gl={{ antialias: true, powerPreference: 'low-power' }}>
                <ambientLight intensity={1.4} />
                <directionalLight position={[4, 7, 5]} intensity={2} />
                <VehiclePreview vehicle={selected} colour={selectedColour?.hex ?? '#e7e2d7'} />
              </Canvas>
            </div>
            <p className="m-0 mt-2 text-[11px] leading-relaxed text-ui-muted">No realistic vehicle models are installed yet. This low-poly in-game preview is a temporary placeholder, not a production car asset.</p>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Paint colours">
              {selected.colours.map((colourId) => {
                const colour = vehicleColourById(colourId)!;
                const current = owned?.colour ?? (selected.colours.includes(selectedColourId) ? selectedColourId : selected.colours[0]);
                return (
                  <button
                    key={colour.id}
                    type="button"
                    onClick={() => {
                      if (owned) onPaint(selected.id, colour.id);
                      else {
                        setSelectedColourId(colour.id);
                        setMessage(`${colour.name} selected for the ${selected.name}.`);
                      }
                    }}
                    aria-label={`Select ${colour.name}`}
                    aria-pressed={current === colour.id}
                    title={owned ? `Paint owned car ${colour.name}` : colour.name}
                    className={`h-7 w-7 rounded-full border-2 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent ${current === colour.id ? 'border-ui-accent-strong' : 'border-white/25'}`}
                    style={{ backgroundColor: colour.hex }}
                  />
                );
              })}
            </div>
            <p className="m-0 mt-1 text-[10px] text-ui-muted">{selectedColour?.name ?? vehicleColourById(selected.colours[0])?.name} paint{owned ? ' · saved to garage' : ''}</p>
            <div className="mt-auto pt-4">
              {message && <p role="status" className="mb-3 mt-0 text-xs leading-relaxed text-ui-accent-strong">{message}</p>}
              {owned ? (
                <button type="button" onClick={takeOut} className="w-full rounded-lg bg-ui-accent px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#191a18] transition hover:brightness-110 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent">
                  Take this car out
                </button>
              ) : (
                <button type="button" onClick={buySelected} disabled={tab === 'garage' || purchasePaused} className="w-full rounded-lg bg-ui-accent px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#191a18] transition hover:brightness-110 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-45">
                  {confirmId === selected.id ? 'Confirm purchase' : `Purchase · ${selected.price.toLocaleString()} GHAI`}
                </button>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
