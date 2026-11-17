import {describe,expect,it} from 'vitest';
import {canWalk,nearestWalkableTerrainPoint,terrainRoute} from './terrainNavigation';
import {EXIT_EGRESS_ROUTES} from '../worldData';

describe('free terrain navigation',()=>{
  it('allows dry courtyards and rejects stream water',()=>{
    expect(canWalk({x:900,y:550})).toBe(true);
    expect(canWalk({x:200,y:700})).toBe(false);
    expect(canWalk({x:900,y:740})).toBe(true);
  });
  it('routes around water without placing waypoints in it',()=>{
    const route=terrainRoute({x:500,y:600},{x:500,y:850});
    expect(route.length).toBeGreaterThan(1);
    expect(route.every(point=>canWalk(point))).toBe(true);
  });
  it('keeps open dry-ground travel direct and smooth',()=>{
    expect(terrainRoute({x:850,y:500},{x:1050,y:550})).toEqual([{x:1050,y:550}]);
  });
  it('recovers an invalid water position to nearby dry ground',()=>{
    const safe=nearestWalkableTerrainPoint({x:520,y:720});
    expect(canWalk(safe)).toBe(true);
    expect(Math.hypot(safe.x-520,safe.y-720)).toBeLessThan(320);
  });
  it('keeps the wish pavilion body blocked and its bridge entrance walkable',()=>{
    expect(canWalk({x:245,y:600})).toBe(false);
    expect(canWalk({x:410,y:710})).toBe(true);
    const route=terrainRoute({x:700,y:620},{x:410,y:710});
    expect(route.length).toBeGreaterThan(0);
    expect(route.at(-1)).toEqual({x:410,y:710});
  });

  it.each([
    ['wish',{x:900,y:620},{x:410,y:710}],
    ['wealth',{x:900,y:431},{x:434,y:276}],
  ])('finds a collision-safe fine-grid route to %s',(_name,start,end)=>{
    const route=terrainRoute(start,end,16);
    expect(route.length).toBeGreaterThan(0);
    let previous=start;
    for(const target of route){
      const distance=Math.hypot(target.x-previous.x,target.y-previous.y),steps=Math.max(1,Math.ceil(distance/8));
      for(let step=1;step<=steps;step++)expect(canWalk({x:previous.x+(target.x-previous.x)*step/steps,y:previous.y+(target.y-previous.y)*step/steps})).toBe(true);
      previous=target;
    }
  });

  it('keeps every Wealth Hall egress step and segment collision-safe',()=>{
    const route=EXIT_EGRESS_ROUTES.wealth!;
    for(let index=1;index<route.length;index++){
      const a=route[index-1],b=route[index],distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance/6));
      for(let step=0;step<=steps;step++){const point={x:a.x+(b.x-a.x)*step/steps,y:a.y+(b.y-a.y)*step/steps};expect(canWalk(point),`unsafe Wealth Hall egress at ${JSON.stringify(point)}`).toBe(true)}
    }
  });
});
