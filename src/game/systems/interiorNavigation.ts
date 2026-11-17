export interface Point{x:number;y:number}

// Shared perspective floor footprint used by the generated interior atlas:
// a trapezoidal room floor plus the bottom-centre doorway corridor.
export const INTERIOR_WALKABLE:Point[]=[
 {x:170,y:310},{x:790,y:310},{x:865,y:550},{x:575,y:550},
 {x:575,y:620},{x:385,y:620},{x:385,y:550},{x:95,y:550},
];

export function isPointInPolygon(point:Point,polygon:Point[]=INTERIOR_WALKABLE){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if(((a.y>point.y)!==(b.y>point.y))&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}

export function nearestWalkablePoint(point:Point,polygon:Point[]=INTERIOR_WALKABLE):Point{
 if(isPointInPolygon(point,polygon))return{x:point.x,y:point.y};
 let best={x:polygon[0].x,y:polygon[0].y},bestDistance=Infinity;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length)):0;
  const candidate={x:a.x+t*dx,y:a.y+t*dy},distance=Math.hypot(point.x-candidate.x,point.y-candidate.y);
  if(distance<bestDistance){bestDistance=distance;best=candidate}
 }
 // Nudge inward so floating-point rounding cannot leave the player outside.
 return{x:best.x+(480-best.x)*.006,y:best.y+(460-best.y)*.006};
}
