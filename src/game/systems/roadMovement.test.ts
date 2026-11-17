import {describe,expect,it} from 'vitest';
import {advanceRoadPosition,edgeBetween,expandedRoadPathFrom,locateRoadPosition,roadEdges,roadPoint} from './roadMovement';
import {roadNodeRoute} from './roadNavigation';
import {canWalk} from './terrainNavigation';

describe('road-bound movement',()=>{
 it('creates a connected edge model',()=>{expect(roadEdges.length).toBeGreaterThan(20);expect(roadEdges.every(edge=>edge.length>0)).toBe(true)});
 it('keeps the visitor on a road after one thousand movement frames',()=>{
  let position=locateRoadPosition(900,1015);
  for(let frame=0;frame<1000;frame++)position=advanceRoadPosition(position,{x:0,y:-1},58/60);
  const point=roadPoint(position);
  const projected=roadPoint(locateRoadPosition(point.x,point.y));
  expect(Math.hypot(projected.x-point.x,projected.y-point.y)).toBeLessThan(.001);
 });
 it('never exceeds the configured distance for a frame',()=>{
  const before=locateRoadPosition(900,900),a=roadPoint(before);
  const after=advanceRoadPosition(before,{x:0,y:-1},58/60),b=roadPoint(after);
  expect(Math.hypot(b.x-a.x,b.y-a.y)).toBeLessThanOrEqual(58/60+.001);
 });
 it('allows the direct western fork toward the Wish Pavilion',()=>{
  const edge=edgeBetween('courtSouth','wishA')!;
  for(let step=0;step<=100;step++){
   const point=roadPoint({edgeId:edge.id,t:step/100});
   expect(canWalk(point),`blocked western fork at ${JSON.stringify(point)}`).toBe(true);
  }
 });
 it('turns from Tai Chi into the Wish Pavilion fork without sticking',()=>{
  const incoming=edgeBetween('courtSouth','taichi')!;
  let position={edgeId:incoming.id,t:incoming.to==='courtSouth'?.99:.01};
  for(let frame=0;frame<80;frame++)position=advanceRoadPosition(position,{x:-1,y:-.2},58/60);
  expect(position.edgeId).toBe(edgeBetween('courtSouth','wishA')!.id);
  expect(roadPoint(position).x).toBeLessThan(895);
 });
});

it('expands curved western routes instead of cutting across the pond',()=>{
  const start=locateRoadPosition(900,820);
  const nodes=roadNodeRoute(900,820,410,710);
  const path=expandedRoadPathFrom(start,nodes);
  expect(path.length).toBeGreaterThan(nodes.length);
  expect(path.some(point=>point.x===635&&point.y===755)).toBe(true);
  expect(path.at(-1)).toEqual({x:410,y:710});
});

it.each([
  ['wealth to wish',{x:434,y:276},{x:410,y:710}],
  ['wealth to library',{x:434,y:276},{x:1477,y:421}],
  ['wish to meditation cave',{x:410,y:710},{x:1734,y:186}],
])('keeps the planned %s route on collision-safe ground',(_label,start,end)=>{
  const position=locateRoadPosition(start.x,start.y);
  const nodes=roadNodeRoute(start.x,start.y,end.x,end.y);
  const path=expandedRoadPathFrom(position,nodes);
  expect(path.at(-1)).toEqual(end);
  for(let index=1;index<path.length;index++){
    const a=path[index-1],b=path[index],distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance/8));
    for(let step=0;step<=steps;step++){const point={x:a.x+(b.x-a.x)*step/steps,y:a.y+(b.y-a.y)*step/steps};expect(canWalk(point),`${_label}: ${JSON.stringify(a)} -> ${JSON.stringify(b)} failed at ${JSON.stringify(point)}`).toBe(true)}
  }
});
