export interface RoadNode {id:string;x:number;y:number;links:string[]}
export const roadNodes:RoadNode[]=[
 {id:'gate',x:900,y:1015,links:['gateCourt']},
 {id:'gateCourt',x:900,y:920,links:['gate','gatePath']},
 {id:'gatePath',x:900,y:820,links:['gateCourt','bridge']},
 {id:'bridge',x:900,y:700,links:['gatePath','courtSouth']},
 {id:'courtSouth',x:900,y:620,links:['bridge','taichi','wishA','gardenA']},
 {id:'taichi',x:900,y:552,links:['courtSouth','courtNorth','oracleA','libraryA']},
 {id:'courtNorth',x:900,y:485,links:['taichi','sanqing']},
 {id:'sanqing',x:900,y:431,links:['courtNorth']},
 {id:'wealthB',x:530,y:320,links:['oracleA','wealth']},
 {id:'wealth',x:434,y:276,links:['wealthB']},
 {id:'oracleA',x:650,y:500,links:['taichi','oracleB','wealthB']},
 {id:'oracleB',x:455,y:480,links:['oracleA','oracle']},
 {id:'oracle',x:305,y:463,links:['oracleB']},
 {id:'wishA',x:700,y:760,links:['courtSouth','wishB']},
 {id:'wishB',x:500,y:730,links:['wishA','wishC']},
 {id:'wishC',x:425,y:710,links:['wishB','wish']},
 {id:'wish',x:410,y:710,links:['wishC']},
 {id:'libraryA',x:1100,y:500,links:['taichi','libraryB']},
 {id:'libraryB',x:1250,y:470,links:['libraryA','library']},
 {id:'library',x:1477,y:421,links:['libraryB','bambooA']},
 {id:'gardenA',x:1100,y:570,links:['courtSouth','gardenB']},
 {id:'gardenB',x:1280,y:635,links:['gardenA','garden']},
 {id:'garden',x:1547,y:673,links:['gardenB']},
 {id:'bambooA',x:1685,y:390,links:['library','bambooB']},
 {id:'bambooB',x:1685,y:290,links:['bambooA','bamboo']},
 {id:'bamboo',x:1734,y:186,links:['bambooB']},
];
const byId=new Map(roadNodes.map(n=>[n.id,n]));
export function nearestRoadNode(x:number,y:number){return roadNodes.reduce((best,node)=>Math.hypot(node.x-x,node.y-y)<Math.hypot(best.x-x,best.y-y)?node:best)}
export function roadRoute(fromX:number,fromY:number,toX:number,toY:number){const start=nearestRoadNode(fromX,fromY),goal=nearestRoadNode(toX,toY);const queue=[start.id],previous=new Map<string,string|undefined>([[start.id,undefined]]);while(queue.length){const id=queue.shift()!;if(id===goal.id)break;for(const link of byId.get(id)!.links)if(!previous.has(link)){previous.set(link,id);queue.push(link)}}const ids:string[]=[];let cursor:string|undefined=goal.id;while(cursor){ids.unshift(cursor);cursor=previous.get(cursor)}return ids.map(id=>{const n=byId.get(id)!;return{x:n.x,y:n.y}})}
export function roadNodeRoute(fromX:number,fromY:number,toX:number,toY:number){const start=nearestRoadNode(fromX,fromY),goal=nearestRoadNode(toX,toY);const queue=[start.id],previous=new Map<string,string|undefined>([[start.id,undefined]]);while(queue.length){const id=queue.shift()!;if(id===goal.id)break;for(const link of byId.get(id)!.links)if(!previous.has(link)){previous.set(link,id);queue.push(link)}}const ids:string[]=[];let cursor:string|undefined=goal.id;while(cursor){ids.unshift(cursor);cursor=previous.get(cursor)}return ids.map(id=>byId.get(id)!)}
function pointSegmentDistance(px:number,py:number,ax:number,ay:number,bx:number,by:number){const dx=bx-ax,dy=by-ay;const length=dx*dx+dy*dy;if(!length)return Math.hypot(px-ax,py-ay);const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/length));return Math.hypot(px-(ax+t*dx),py-(ay+t*dy))}
export function isOnRoad(x:number,y:number,corridor=48){for(const node of roadNodes)for(const link of node.links){const other=byId.get(link)!;if(pointSegmentDistance(x,y,node.x,node.y,other.x,other.y)<=corridor)return true}return false}

export interface RoadProjection{x:number;y:number;tangentX:number;tangentY:number;distance:number}
export function nearestRoadProjection(x:number,y:number,desiredX=0,desiredY=0):RoadProjection{
 const desiredLength=Math.hypot(desiredX,desiredY)||1;
 let best:RoadProjection|undefined,bestScore=Infinity;
 for(const node of roadNodes)for(const link of node.links){
  if(node.id>link)continue;
  const other=byId.get(link)!,dx=other.x-node.x,dy=other.y-node.y,length=Math.hypot(dx,dy)||1;
  const t=Math.max(0,Math.min(1,((x-node.x)*dx+(y-node.y)*dy)/(length*length)));
  const px=node.x+t*dx,py=node.y+t*dy,distance=Math.hypot(x-px,y-py);
  const tx=dx/length,ty=dy/length,alignment=Math.abs((desiredX/desiredLength)*tx+(desiredY/desiredLength)*ty);
  const score=distance-alignment*22;
  if(score<bestScore){bestScore=score;best={x:px,y:py,tangentX:tx,tangentY:ty,distance}}
 }
 return best!;
}
