import {describe,expect,it} from 'vitest';
import {isOnRoad,nearestRoadNode,nearestRoadProjection,roadRoute} from './roadNavigation';

describe('road navigation',()=>{
 it('snaps destinations to the nearest road node',()=>expect(nearestRoadNode(410,710).id).toBe('wish'));
 it('routes from the gate to the library using walkable nodes',()=>{
  const route=roadRoute(900,1015,1477,421);
  expect(route[0]).toEqual({x:900,y:1015});
  expect(route.at(-1)).toEqual({x:1477,y:421});
  expect(route.every(({x,y})=>isOnRoad(x,y))).toBe(true);
 });
 it('connects both new worship halls to the central road network',()=>{
  expect(roadRoute(900,552,900,431).at(-1)).toEqual({x:900,y:431});
  expect(roadRoute(900,552,434,276).at(-1)).toEqual({x:434,y:276});
 });
 it('projects free movement back onto the stone path centre',()=>{
  const projection=nearestRoadProjection(930,850,0,-1);
  expect(projection.x).toBeCloseTo(900);
  expect(projection.distance).toBeCloseTo(30);
  expect(Math.abs(projection.tangentY)).toBeCloseTo(1);
 });
 it('rejects distant mountain terrain',()=>{expect(isOnRoad(900,800)).toBe(true);expect(isOnRoad(50,100)).toBe(false)});
});
