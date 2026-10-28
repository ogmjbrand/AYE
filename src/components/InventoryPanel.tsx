import { useEffect, type ReactNode } from 'react';
import type { Career, Character } from './CharacterCreation';
import type { GameState } from '../lib/gameState';
import { equipmentById } from '../lib/equipment';
import { vehicleById } from '../lib/vehicleCatalog';
import { catalogueItem } from '../lib/furniture';
import { GearInventory } from './WorkGear';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-muted">{title}</p>
      {children}
    </section>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  return items.length
    ? <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">{items.map((x, i) => <li key={`${x}${i}`} className="rounded-full border border-ui-gold/25 bg-[#1a1815] px-2.5 py-1 text-xs">{x}</li>)}</ul>
    : <p className="m-0 text-xs text-ui-muted">{empty}</p>;
}

/**
 * Everything you own, in one place: work gear (equip, put away, repair,
 * sell), gadgets, vehicles, furniture and clothes. Nothing here is ever taken
 * away except by selling it yourself.
 */
export function InventoryPanel({ state, character, career, rankIndex, onEquip, onUnequip, onRepair, onSell, onOpenWardrobe, onClose }: {
  state: GameState;
  character: Character;
  career: Career;
  rankIndex: number;
  onEquip: (uid: string) => void;
  onUnequip: (uid: string) => void;
  onRepair: (uid: string) => void;
  onSell: (uid: string) => void;
  onOpenWardrobe: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const gadgets = state.equipment.map((id) => equipmentById(id)?.name).filter(Boolean) as string[];
  const vehicles = state.ownedVehicles.map((v) => vehicleById(v.modelId)?.name).filter(Boolean) as string[];
  const furniture = state.furniture.map((f) => catalogueItem(f.itemId)?.name).filter(Boolean) as string[];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="inventory-title" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full flex-col rounded-t-[2rem] border border-ui-gold/40 bg-[#050505] text-ui-ink sm:max-w-lg sm:rounded-[2rem]">
        <header className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <h2 id="inventory-title" className="m-0 font-display text-2xl font-semibold text-ui-cream">Inventory</h2>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">Close</button>
        </header>
        <div className="space-y-5 overflow-y-auto p-6">
          <Section title="Work gear">
            <GearInventory career={career} rankIndex={rankIndex} balance={state.balance} owned={state.gear} onEquip={onEquip} onUnequip={onUnequip} onRepair={onRepair} onSell={onSell} />
          </Section>
          <Section title="Clothes">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-xs text-ui-muted">{character.wardrobe.owned.length} pieces in your wardrobe.</p>
              <button type="button" onClick={onOpenWardrobe} className="shrink-0 rounded-lg border border-ui-gold/40 px-3 py-1.5 text-xs font-semibold hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">Change outfit</button>
            </div>
          </Section>
          <Section title="Gadgets and kits"><List items={gadgets} empty="None yet: the Gadget Hub sells phones and work kits." /></Section>
          <Section title="Vehicles"><List items={vehicles} empty="No vehicles yet: Marina Motors sells them." /></Section>
          <Section title="Furniture"><List items={furniture} empty="Only what your home came with." /></Section>
        </div>
      </div>
    </div>
  );
}
