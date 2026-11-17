import {describe,expect,it} from 'vitest';
import {isPointInPolygon,nearestWalkablePoint} from './interiorNavigation';

describe('interior navigation',()=>{
 it('allows the central floor and doorway',()=>{
  expect(isPointInPolygon({x:480,y:420})).toBe(true);
  expect(isPointInPolygon({x:480,y:590})).toBe(true);
 });
 it('rejects roofs, altars, walls and side furniture',()=>{
  expect(isPointInPolygon({x:650,y:120})).toBe(false);
  expect(isPointInPolygon({x:480,y:220})).toBe(false);
  expect(isPointInPolygon({x:70,y:430})).toBe(false);
 });
 it('snaps invalid clicks back to the floor boundary',()=>{
  const target=nearestWalkablePoint({x:650,y:120});
  expect(isPointInPolygon(target)).toBe(true);
  expect(target.y).toBeGreaterThanOrEqual(310);
 });
});
