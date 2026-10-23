import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Character } from '../components/CharacterCreation';
import type { FurnitureTarget, GameState } from '../lib/gameState';
import { applyStart, lifeReducer, type AnyAction } from '../lib/life';
import type { DreamId, TraitId } from '../lib/lifeState';
import { hasProgress, loadProgress, saveProgress } from '../lib/save';
import type { TravelMode } from '../lib/travel';
import type { ParkedSpot } from '../lib/cars';
import type { Activity } from '../lib/people';
import type { Needs } from '../lib/needs';
import type { CampusRoom, CampusVisit, StudyKind } from '../lib/school';

/** Real milliseconds per game minute. */
export const MS_PER_GAME_MINUTE = 3000;

/**
 * The single source of truth for the game clock, balance and daily ledger.
 * Mount it once per character (key the component by character id).
 *
 * `isAtWorkplace` is read on every tick to decide whether that minute is paid.
 */
export function useGameState(character: Character, isAtWorkplace: () => boolean, isOnCampus: () => boolean = () => false) {
  const atWorkRef = useRef(isAtWorkplace);
  const onCampusRef = useRef(isOnCampus);
  useEffect(() => {
    atWorkRef.current = isAtWorkplace;
    onCampusRef.current = isOnCampus;
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
      () => dispatch({ type: 'tick', atWorkplace: atWorkRef.current(), onCampus: onCampusRef.current() }),
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
    moveOut: () => dispatch({ type: 'moveOut' }),
    buyEquipment: (id: string) => dispatch({ type: 'buyEquipment', id }),
    buyCar: (id: string, color: string) => dispatch({ type: 'buyCar', id, color }),
    sellCar: (id: string) => dispatch({ type: 'sellCar', id }),
    fuel: (carId: string, metres: number) => dispatch({ type: 'fuel', carId, metres }),
    parkCar: (carId: string, spot: ParkedSpot | null) => dispatch({ type: 'parkCar', carId, spot }),
    bookHotel: () => dispatch({ type: 'bookHotel' }),
    hotelWash: () => dispatch({ type: 'hotelWash' }),
    travel: (to: string, mode: TravelMode) => dispatch({ type: 'travel', to, mode }),
    socialise: (residentId: string, activity: Activity) => dispatch({ type: 'socialise', residentId, activity }),
    nightOut: (residentId: string) => dispatch({ type: 'nightOut', residentId }),
    wait: (minutes: number) => dispatch({ type: 'wait', minutes }),
    workTask: (taskId: string, choice: number) => dispatch({ type: 'workTask', taskId, choice, atWorkplace: atWorkRef.current() }),
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
    startClass: (classId: string, room: CampusRoom) => dispatch({ type: 'startClass', classId, room }),
    leaveClass: () => dispatch({ type: 'leaveClass' }),
    participate: (what: 'notes' | 'asked') => dispatch({ type: 'participate', what }),
    finishClass: () => dispatch({ type: 'finishClass' }),
    study: (kind: StudyKind, room: CampusRoom) => dispatch({ type: 'study', kind, room }),
    handIn: (room: CampusRoom) => dispatch({ type: 'handIn', room }),
    campusVisit: (place: CampusVisit) => dispatch({ type: 'campusVisit', place }),
    joinClub: (id: string) => dispatch({ type: 'joinClub', id }),
    campusChat: (room: CampusRoom) => dispatch({ type: 'campusChat', room }),
    freshenUp: (room: CampusRoom) => dispatch({ type: 'freshenUp', room }),
    clockIn: () => dispatch({ type: 'clockIn' }),
    clockOut: () => dispatch({ type: 'clockOut' }),
    seePatient: (patientId: string) => dispatch({ type: 'seePatient', patientId }),
    setSavingsGoal: (amount: number | null) => dispatch({ type: 'setSavingsGoal', amount }),
  };
}
