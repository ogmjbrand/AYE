import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Character } from '../components/CharacterCreation';
import type { FurnitureTarget, GameState, PhoneContact } from '../lib/gameState';
import { applyStart, lifeReducer, type AnyAction } from '../lib/life';
import type { DreamId, TraitId } from '../lib/lifeState';
import { hasProgress, loadProgress, saveProgress } from '../lib/save';
import type { TravelMode } from '../lib/travel';
import type { Activity } from '../lib/people';
import type { Needs } from '../lib/needs';
import type { Wardrobe } from '../lib/fashion';
import type { OfficeTaskId } from '../lib/officeCareer';
import type { ClassSlot } from '../lib/campus';
import type { EventFrequency } from '../lib/liveEvents';

/** Real milliseconds per game minute. */
export const MS_PER_GAME_MINUTE = 3000;

/**
 * The single source of truth for the game clock, balance and daily ledger.
 * Mount it once per character (key the component by character id).
 *
 * `isAtWorkplace` is read on every tick to decide whether that minute is paid.
 */
export function useGameState(character: Character, isAtWorkplace: () => boolean) {
  const atWorkRef = useRef(isAtWorkplace);
  useEffect(() => {
    atWorkRef.current = isAtWorkplace;
  });

  const reducer = useCallback(
    (state: GameState, action: AnyAction) =>
      lifeReducer(state, action, character.career, character.lifestyle),
    [character.career, character.lifestyle],
  );
  // A brand-new life starts with the choices made at creation (traits, dream, first home)
  const [state, dispatch] = useReducer(reducer, character, (c) => (hasProgress(c) ? loadProgress(c) : applyStart(loadProgress(c), c.start, c.career, c.lifestyle)));

  useEffect(() => {
    const interval = setInterval(
      () => dispatch({ type: 'tick', atWorkplace: atWorkRef.current() }),
      MS_PER_GAME_MINUTE,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    saveProgress(character.id, state);
  }, [character.id, state]);

  return {
    state,
    rest: (atHome: boolean, atFriend = false) => dispatch({ type: 'sleep', atHome, atFriend }),
    moveIn: (homeId: string) => dispatch({ type: 'moveIn', homeId }),
    buyHome: (homeId: string) => dispatch({ type: 'buyHome', homeId }),
    spaTreat: (serviceId: string, friendId?: string) => dispatch({ type: 'spaTreat', serviceId, friendId }),
    spaHire: () => dispatch({ type: 'spaHire' }),
    spaClockIn: () => dispatch({ type: 'spaClockIn' }),
    spaClockOut: () => dispatch({ type: 'spaClockOut' }),
    spaSession: (clientId: string, choices: readonly number[]) => dispatch({ type: 'spaSession', clientId, choices }),
    moveOut: () => dispatch({ type: 'moveOut' }),
    buyEquipment: (id: string) => dispatch({ type: 'buyEquipment', id }),
    bookHotel: () => dispatch({ type: 'bookHotel' }),
    hotelWash: () => dispatch({ type: 'hotelWash' }),
    travel: (to: string, mode: TravelMode) => dispatch({ type: 'travel', to, mode }),
    socialise: (residentId: string, activity: Activity, scent = false) => dispatch({ type: 'socialise', residentId, activity, scent }),
    nightOut: (residentId: string, scent = false) => dispatch({ type: 'nightOut', residentId, scent }),
    phoneFriend: (residentId: string, kind: PhoneContact) => dispatch({ type: 'phoneFriend', residentId, kind }),
    ride: (metres: number) => dispatch({ type: 'ride', metres }),
    hug: (residentId: string) => dispatch({ type: 'hug', residentId }),
    fashionShowcase: (wardrobe: Wardrobe) => dispatch({
      type: 'fashionShowcase',
      owned: wardrobe.owned,
      equipped: wardrobe.equipped,
    }),
    buyFashionItem: (id: string) => dispatch({ type: 'buyFashionItem', id }),
    wait: (minutes: number) => dispatch({ type: 'wait', minutes }),
    eventRespond: () => dispatch({ type: 'eventRespond' }),
    ascendUnlock: () => dispatch({ type: 'ascendUnlock' }),
    buyGear: (itemId: string) => dispatch({ type: 'buyGear', itemId }),
    equipGear: (uid: string) => dispatch({ type: 'equipGear', uid }),
    unequipGear: (uid: string) => dispatch({ type: 'unequipGear', uid }),
    repairGear: (uid: string) => dispatch({ type: 'repairGear', uid }),
    sellGear: (uid: string) => dispatch({ type: 'sellGear', uid }),
    transformForm: () => dispatch({ type: 'transform' }),
    returnToHuman: () => dispatch({ type: 'returnToHuman' }),
    sanctuaryHeal: (atHome: boolean) => dispatch({ type: 'sanctuaryHeal', atHome }),
    hurt: (amount: number, reason: string) => dispatch({ type: 'hurt', amount, reason }),
    buyMedical: (itemId: string) => dispatch({ type: 'buyMedical', itemId }),
    useMedical: (itemId: string) => dispatch({ type: 'useMedical', itemId }),
    callMedic: () => dispatch({ type: 'callMedic' }),
    restToRecover: () => dispatch({ type: 'restToRecover' }),
    eventDismiss: () => dispatch({ type: 'eventDismiss' }),
    eventAct: (objectiveId: string, at: { x: number; z: number }) => dispatch({ type: 'eventAct', objectiveId, at }),
    eventSeen: () => dispatch({ type: 'eventSeen' }),
    setEventFrequency: (frequency: EventFrequency) => dispatch({ type: 'setEventFrequency', frequency }),
    workTask: (taskId: string, choice: number) => dispatch({ type: 'workTask', taskId, choice, atWorkplace: atWorkRef.current() }),
    officeApply: (atReception: boolean) => dispatch({ type: 'officeApply', atReception }),
    officeClockIn: (atReception: boolean) => dispatch({ type: 'officeClockIn', atReception }),
    officeTask: (taskId: OfficeTaskId, choice: number, atStation: OfficeTaskId | null) =>
      dispatch({ type: 'officeTask', taskId, choice, atStation }),
    officeClockOut: (atReception: boolean) => dispatch({ type: 'officeClockOut', atReception }),
    campusClass: (slot: ClassSlot['id'], inHall: boolean) => dispatch({ type: 'campusClass', slot, inHall }),
    campusAssignment: (choice: number, atDesk: boolean) => dispatch({ type: 'campusAssignment', choice, atDesk }),
    campusStudy: (atLibrary: boolean) => dispatch({ type: 'campusStudy', atLibrary }),
    hospitalClockIn: (atReception: boolean) => dispatch({ type: 'hospitalClockIn', atReception }),
    hospitalBrief: (atSupervisor: boolean) => dispatch({ type: 'hospitalBrief', atSupervisor }),
    hospitalPatient: (choice: number, atWard: boolean) => dispatch({ type: 'hospitalPatient', choice, atWard }),
    hospitalClockOut: (atReception: boolean) => dispatch({ type: 'hospitalClockOut', atReception }),
    dismissSummary: () => dispatch({ type: 'dismissSummary' }),
    eat: (price: number, fullness: number, lift?: Partial<Needs>) => dispatch({ type: 'eat', price, fullness, lift }),
    purchase: (price: number) => dispatch({ type: 'purchase', price }),
    buyFurniture: (itemId: string) => dispatch({ type: 'buyFurniture', itemId }),
    sellFurniture: (uid: string) => dispatch({ type: 'sellFurniture', uid }),
    placeFurniture: (uid: string, at: readonly [number, number], rot: 0 | 1) => dispatch({ type: 'placeFurniture', uid, at, rot }),
    storeFurniture: (uid: string) => dispatch({ type: 'storeFurniture', uid }),
    operateFurniture: (target: FurnitureTarget, near: boolean) => dispatch({ type: 'useFurniture', target, near }),
    exercise: (minutes: number, atPark: boolean) => dispatch({ type: 'exercise', minutes, atPark }),
    visit: (placeId: string) => dispatch({ type: 'visit', placeId }),
    setProfile: (bio: string, traits: TraitId[]) => dispatch({ type: 'setProfile', bio, traits }),
    setDream: (dream: DreamId) => dispatch({ type: 'setDream', dream }),
    dismissWish: (id: string) => dispatch({ type: 'dismissWish', id }),
    setSavingsGoal: (amount: number | null) => dispatch({ type: 'setSavingsGoal', amount }),
    drove: (metres: number) => dispatch({ type: 'drove', metres }),
    buyVehicle: (modelId: string, colour: string) => dispatch({ type: 'buyVehicle', modelId, colour }),
    paintVehicle: (modelId: string, colour: string) => dispatch({ type: 'paintVehicle', modelId, colour }),
  };
}
