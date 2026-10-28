import { useState } from 'react';
import type { Career } from './CharacterCreation';
import { SLOT_LABEL, TIER_LABEL, canBuy, gearById, gearFor, repairCost, resaleValue, type GearItem, type OwnedGear } from '../lib/careerGear';
import { careerLadder } from '../lib/progression';

const money = (n: number) => `${Math.round(n).toLocaleString()} GHAI`;
const pct = (n: number) => `+${Math.round(n * 100)}%`;
const SMALL_GOLD = 'shrink-0 rounded-lg bg-gradient-to-b from-[#e8b452] via-[#d79d3c] to-[#c88a2c] px-3 py-1.5 text-xs font-bold text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0c67e]';
const SMALL_DARK = 'shrink-0 rounded-lg border border-ui-gold/40 px-3 py-1.5 text-xs font-semibold hover:border-ui-gold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold';

/** A purchase or sale waiting for a yes: what it is, what it costs or pays, and your balance after. */
export function ConfirmRow({ text, amount, balance, onConfirm, onCancel }: { text: string; amount: number; balance: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="mt-2 rounded-lg border border-ui-gold/50 bg-black/40 p-2.5 text-xs" role="group" aria-label="Confirm">
      <p className="m-0">{text}</p>
      <p className="m-0 mt-0.5 text-ui-muted">Balance after: <span className="tabular-nums text-ui-ink">{money(balance + amount)}</span></p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onConfirm} autoFocus className={SMALL_GOLD}>Confirm</button>
        <button type="button" onClick={onCancel} className={SMALL_DARK}>Cancel</button>
      </div>
    </div>
  );
}

/**
 * Your career's gear at the shop: compare tiers, prices, pay bonus and how
 * long each lasts; see which need a higher rank; buy with a confirmation.
 */
export function WorkGearShop({ career, rankIndex, balance, owned, onBuy }: {
  career: Career;
  rankIndex: number;
  balance: number;
  owned: readonly OwnedGear[];
  onBuy: (itemId: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const items = gearFor(career);
  if (career === 'none') return <p className="m-0 p-4 text-sm text-ui-muted">Pick a career first: every career has its own gear.</p>;
  const ladder = careerLadder(career);
  const bySlot = (['tool', 'tech', 'pro'] as const).map((slot) => ({ slot, items: items.filter((x) => x.slot === slot) })).filter((g) => g.items.length);
  return (
    <div className="space-y-4 p-4">
      <p className="m-0 text-xs text-ui-muted">Gear for your career. Equipped gear raises your pay while it&rsquo;s in working condition, and wears as you work. Better pieces need a higher rank: you&rsquo;re <span className="text-ui-ink">{ladder[rankIndex]?.title}</span>.</p>
      {bySlot.map(({ slot, items: list }) => (
        <section key={slot}>
          <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-muted">{SLOT_LABEL[slot]}</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {list.map((item: GearItem) => {
              const check = canBuy(item, career, rankIndex, balance, owned);
              const have = owned.some((o) => o.itemId === item.id);
              return (
                <li key={item.id} className="rounded-xl border border-ui-gold/25 bg-[#1a1815] p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-semibold">{item.name} <span className="ml-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ui-muted">{TIER_LABEL[item.tier]}</span></p>
                      <p className="m-0 mt-0.5 text-xs text-ui-muted">{item.description}</p>
                      <p className="m-0 mt-1 text-[11px] text-ui-gold-strong">{pct(item.payBonus)} pay · lasts {item.lifeHours} working hours{item.rank > 0 ? ` · rank: ${ladder[item.rank]?.title}` : ''}</p>
                    </div>
                    {have ? <span className="shrink-0 text-xs font-semibold text-ui-success">Owned</span> : (
                      <button type="button" disabled={!check.ok} title={check.ok ? undefined : check.reason} onClick={() => setConfirming(item.id)} className={SMALL_GOLD}>{money(item.price)}</button>
                    )}
                  </div>
                  {!have && !check.ok && <p className="m-0 mt-1 text-[11px] text-ui-warn">{check.reason}</p>}
                  {confirming === item.id && check.ok && (
                    <ConfirmRow text={`Buy ${item.name} for ${money(item.price)}?`} amount={-item.price} balance={balance} onConfirm={() => { onBuy(item.id); setConfirming(null); }} onCancel={() => setConfirming(null)} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Your gear in the inventory: equip or put away, repair, sell (with a confirmation). */
export function GearInventory({ career, rankIndex, balance, owned, onEquip, onUnequip, onRepair, onSell }: {
  career: Career;
  rankIndex: number;
  balance: number;
  owned: readonly OwnedGear[];
  onEquip: (uid: string) => void;
  onUnequip: (uid: string) => void;
  onRepair: (uid: string) => void;
  onSell: (uid: string) => void;
}) {
  const [selling, setSelling] = useState<string | null>(null);
  if (!owned.length) return <p className="m-0 text-xs text-ui-muted">No work gear yet. The Gadget Hub sells gear for every career.</p>;
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {owned.map((o) => {
        const item = gearById(o.itemId)!;
        const forYou = item.career === career;
        const cost = repairCost(o);
        const value = resaleValue(o);
        return (
          <li key={o.uid} className="rounded-xl border border-ui-gold/25 bg-[#1a1815] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 text-sm font-semibold">{item.name}{o.equipped && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-ui-success">Equipped</span>}</p>
                <p className="m-0 text-[11px] text-ui-muted">{SLOT_LABEL[item.slot]} · {pct(item.payBonus)} pay{forYou ? '' : ' · for another career'}{o.condition <= 0 ? ' · worn out: repair it to use it' : ''}</p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-ui-muted">{Math.round(o.condition)}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2a2620]" role="progressbar" aria-label={`${item.name} condition`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(o.condition)}>
              <div className={`h-full rounded-full ${o.condition > 25 ? 'bg-gradient-to-r from-[#c88a2c] to-[#f0c67e]' : 'bg-ui-warn'}`} style={{ width: `${o.condition}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {o.equipped
                ? <button type="button" onClick={() => onUnequip(o.uid)} className={SMALL_DARK}>Put away</button>
                : <button type="button" onClick={() => onEquip(o.uid)} disabled={!forYou || rankIndex < item.rank} className={SMALL_DARK}>Equip</button>}
              <button type="button" onClick={() => onRepair(o.uid)} disabled={cost <= 0 || balance < cost} className={SMALL_DARK}>{cost > 0 ? `Repair · ${money(cost)}` : 'Like new'}</button>
              <button type="button" onClick={() => setSelling(o.uid)} className={SMALL_DARK}>Sell · {money(value)}</button>
            </div>
            {selling === o.uid && (
              <ConfirmRow text={`Sell ${item.name} for ${money(value)}? It leaves your inventory.`} amount={value} balance={balance} onConfirm={() => { onSell(o.uid); setSelling(null); }} onCancel={() => setSelling(null)} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
