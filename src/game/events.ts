import type { AreaId } from './worldData';
import type { NpcId } from './npcs';

type GameEventMap = {
  nearby: { id: AreaId; active: boolean };
  enterArea: { id: AreaId };
  oracleConsult: { castKey: number };
  activateArea: { id: AreaId };
  navigateArea: { id: AreaId };
  meditationSeat: { active: boolean };
  secret: { id: string };
  npcNearby: { id: NpcId; active: boolean };
  talkNpc: { id: NpcId };
  navigationNotice: { reason: 'unreachable'|'path-cancelled'|'nearest' };
  wishHung: { text: string; theme: string };
  wealthBlessing: { message: string };
  startImmersiveTrail: undefined;
  immersiveTrailComplete: undefined;
};

class EventBus {
  private target = new EventTarget();
  emit<K extends keyof GameEventMap>(type: K, detail: GameEventMap[K]) {
    this.target.dispatchEvent(new CustomEvent(type, { detail }));
  }
  on<K extends keyof GameEventMap>(type: K, handler: (detail: GameEventMap[K]) => void) {
    const listener = (event: Event) => handler((event as CustomEvent<GameEventMap[K]>).detail);
    this.target.addEventListener(type, listener);
    return () => this.target.removeEventListener(type, listener);
  }
}

export const gameEvents = new EventBus();
