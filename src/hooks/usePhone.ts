import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../lib/gameState';
import { batteryNow, deliver, loadPhone, notificationsFor, savePhone, type PhoneNotification, type PhoneState } from '../lib/phone';

/**
 * The phone in your pocket: mounted for the whole game (open or not), so the
 * battery runs down and notifications arrive while it's away. `charging` is
 * being at your own home. Saved to this device as it changes.
 */
export function usePhone(characterId: string, state: GameState, charging: boolean) {
  const now = state.time.totalMinutes;
  const [phone, setPhone] = useState<PhoneState>(() => loadPhone(characterId, now));
  useEffect(() => { savePhone(characterId, phone); }, [characterId, phone]);

  // Battery: the stretch before a change of charger is worked out at the old setting
  const chargingRef = useRef(charging);
  useEffect(() => {
    if (chargingRef.current === charging) return;
    const was = chargingRef.current;
    chargingRef.current = charging;
    setPhone((p) => ({ ...p, battery: batteryNow(p, now, was), batteryAt: now }));
  }, [charging, now]);
  const battery = Math.round(batteryNow(phone, now, charging));

  // Notifications: from what changed in your life since the last state
  const prevRef = useRef(state);
  const notifyRef = useRef(phone.notifications);
  useEffect(() => { notifyRef.current = phone.notifications; });
  const [banner, setBanner] = useState<PhoneNotification | null>(null);
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    const items = notificationsFor(prev, state);
    if (!items.length || !notifyRef.current) return;
    setPhone((p) => deliver(p, items));
    setBanner({ ...items[items.length - 1], id: `banner-${state.time.totalMinutes}`, read: false });
  }, [state]);
  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(id);
  }, [banner]);

  return { phone, setPhone, battery, banner, dismissBanner: () => setBanner(null) };
}
