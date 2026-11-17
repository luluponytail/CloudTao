import { describe, expect, it } from 'vitest';
import { AREA_ENTRANCES, BUILDING_PORTALS, areas } from './worldData';
import { isOnRoad } from './systems/roadNavigation';

describe('temple world', () => {
  it('contains all ten explorable destinations with unique ids', () => {
    expect(areas).toHaveLength(10);
    expect(new Set(areas.map(a => a.id)).size).toBe(10);
  });
  it('keeps all entrances inside the world', () => {
    expect(areas.every(a => a.x > 0 && a.x < 1800 && a.y > 0 && a.y < 1120)).toBe(true);
  });
  it('places every interactive entrance on a walkable road', () => {
    expect(areas.filter(({id})=>id!=='meditation').every(({id}) => isOnRoad(AREA_ENTRANCES[id].x, AREA_ENTRANCES[id].y))).toBe(true);
  });
});

it('keeps every portal approach on its configured road entrance',()=>{
  for(const area of areas)expect(BUILDING_PORTALS[area.id].approach).toEqual(AREA_ENTRANCES[area.id]);
});
