import {WORLD,type AreaId} from '../worldData';

export interface Point{x:number;y:number}
type Rect={x:number;y:number;w:number;h:number;doorX?:number;doorWidth?:number;doorFromY?:number}

// Calibrated against the production map (1800 x 1120). The stream is split at
// the central stone bridge and the pavilion bridge so both remain walkable.
export const waterPolygons:Point[][]=[
  [{x:0,y:625},{x:190,y:600},{x:330,y:620},{x:510,y:675},{x:735,y:710},{x:790,y:730},{x:790,y:815},{x:610,y:805},{x:430,y:770},{x:250,y:745},{x:110,y:810},{x:0,y:825}],
  [{x:1010,y:720},{x:1160,y:690},{x:1320,y:705},{x:1480,y:755},{x:1800,y:720},{x:1800,y:835},{x:1590,y:835},{x:1410,y:815},{x:1210,y:790},{x:1010,y:805}],
  [{x:120,y:680},{x:260,y:650},{x:350,y:675},{x:335,y:735},{x:235,y:755},{x:125,y:790}],
];

// Only the physical building bodies are blocked. Courtyards, lawns, steps and
// all dry ground stay freely walkable. Door strips are intentionally open.
const buildingBlocks:Partial<Record<AreaId,Rect>>={
  meditation:{x:720,y:48,w:360,h:105,doorX:900,doorWidth:58,doorFromY:118},
  sanqing:{x:650,y:190,w:500,h:185,doorX:900,doorWidth:70,doorFromY:330},
  wealth:{x:260,y:142,w:345,h:120,doorX:434,doorWidth:56,doorFromY:225},
  oracle:{x:105,y:295,w:365,h:125,doorX:305,doorWidth:58,doorFromY:380},
  library:{x:1280,y:190,w:385,h:205,doorX:1477,doorWidth:62,doorFromY:340},
  garden:{x:1390,y:500,w:315,h:125,doorX:1547,doorWidth:62,doorFromY:590},
  wish:{x:120,y:510,w:250,h:155},
};

const bridgeSegments=[
  {a:{x:300,y:625},b:{x:470,y:735},halfWidth:62},
  {a:{x:900,y:650},b:{x:900,y:835},halfWidth:90},
  // Western stone route drawn around the pond, from the Wish Pavilion bridge
  // to the central Tai Chi court. These are dry paved passages, not water.
  {a:{x:350,y:680},b:{x:500,y:730},halfWidth:48},
  {a:{x:500,y:730},b:{x:700,y:760},halfWidth:48},
  {a:{x:700,y:760},b:{x:745,y:720},halfWidth:48},
  {a:{x:745,y:720},b:{x:805,y:670},halfWidth:48},
  {a:{x:805,y:670},b:{x:900,y:620},halfWidth:48},
  // Narrow paved fork from the gate approach to the western lakeside path.
  // Width covers the character collision probes without opening the pond.
  {a:{x:900,y:820},b:{x:825,y:805},halfWidth:30},
  {a:{x:825,y:805},b:{x:755,y:785},halfWidth:30},
  {a:{x:755,y:785},b:{x:700,y:760},halfWidth:30},
];

function distanceToSegment(point:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;if(!length)return Math.hypot(point.x-a.x,point.y-a.y);const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length));return Math.hypot(point.x-(a.x+t*dx),point.y-(a.y+t*dy))}
function isOnLegalBridge(point:Point){return bridgeSegments.some(bridge=>distanceToSegment(point,bridge.a,bridge.b)<=bridge.halfWidth)}

function inPolygon(point:Point,polygon:Point[]){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];if(((a.y>point.y)!==(b.y>point.y))&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
}return inside}

function inBlockedBuilding(point:Point,rect:Rect){
  if(point.x<rect.x||point.x>rect.x+rect.w||point.y<rect.y||point.y>rect.y+rect.h)return false;
  if(rect.doorX&&rect.doorWidth&&rect.doorFromY&&point.y>=rect.doorFromY&&Math.abs(point.x-rect.doorX)<=rect.doorWidth/2)return false;
  return true;
}

export function canWalk(point:Point,padding=12){
  if(point.x<padding||point.y<padding||point.x>WORLD.width-padding||point.y>WORLD.height-padding)return false;
  const probes=[point,{x:point.x-padding,y:point.y},{x:point.x+padding,y:point.y},{x:point.x,y:point.y-padding},{x:point.x,y:point.y+padding}];
  if(probes.some(probe=>!isOnLegalBridge(probe)&&waterPolygons.some(polygon=>inPolygon(probe,polygon))))return false;
  return !Object.values(buildingBlocks).some(rect=>rect&&probes.some(probe=>inBlockedBuilding(probe,rect)));
}

export function nearestWalkableTerrainPoint(origin:Point,maxRadius=320,step=16):Point{
  if(canWalk(origin))return origin;
  for(let radius=step;radius<=maxRadius;radius+=step){
    const samples=Math.max(12,Math.ceil(Math.PI*2*radius/step));
    for(let index=0;index<samples;index++){
      const angle=index/samples*Math.PI*2,point={x:origin.x+Math.cos(angle)*radius,y:origin.y+Math.sin(angle)*radius};
      if(canWalk(point))return point;
    }
  }
  return{x:900,y:920};
}

function clearLine(a:Point,b:Point){const distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.ceil(distance/14);for(let i=1;i<=steps;i++){const t=i/steps;if(!canWalk({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}))return false}return true}

export function terrainRoute(from:Point,to:Point,cell=32):Point[]{
  if(clearLine(from,to))return[to];
  const cols=Math.ceil(WORLD.width/cell),rows=Math.ceil(WORLD.height/cell);
  const key=(x:number,y:number)=>`${x},${y}`,point=(x:number,y:number)=>({x:x*cell+cell/2,y:y*cell+cell/2});
  const start={x:Math.max(0,Math.min(cols-1,Math.floor(from.x/cell))),y:Math.max(0,Math.min(rows-1,Math.floor(from.y/cell)))};
  let goal={x:Math.max(0,Math.min(cols-1,Math.floor(to.x/cell))),y:Math.max(0,Math.min(rows-1,Math.floor(to.y/cell)))};
  if(!canWalk(point(goal.x,goal.y))){
    let best=Infinity,found=false;
    for(let radius=1;radius<8&&!found;radius++){
      for(let y=goal.y-radius;y<=goal.y+radius;y++)for(let x=goal.x-radius;x<=goal.x+radius;x++){
        const p=point(x,y),d=Math.hypot(p.x-to.x,p.y-to.y);
        if(canWalk(p)&&d<best){best=d;goal={x,y};found=true}
      }
    }
  }
  const open=[start],came=new Map<string,{x:number;y:number}>(),cost=new Map([[key(start.x,start.y),0]]),dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  while(open.length){open.sort((a,b)=>(cost.get(key(a.x,a.y))!+Math.hypot(a.x-goal.x,a.y-goal.y))-(cost.get(key(b.x,b.y))!+Math.hypot(b.x-goal.x,b.y-goal.y)));const current=open.shift()!;if(current.x===goal.x&&current.y===goal.y)break;
    for(const[dX,dY]of dirs){const next={x:current.x+dX,y:current.y+dY};if(next.x<0||next.y<0||next.x>=cols||next.y>=rows||!canWalk(point(next.x,next.y)))continue;if(dX&&dY&&(!canWalk(point(current.x+dX,current.y))||!canWalk(point(current.x,current.y+dY))))continue;const nextKey=key(next.x,next.y),nextCost=cost.get(key(current.x,current.y))!+(dX&&dY?1.414:1);if(nextCost<(cost.get(nextKey)??Infinity)){cost.set(nextKey,nextCost);came.set(nextKey,current);open.push(next)}}
  }
  const nodes:Point[]=[];let cursor=goal;while(!(cursor.x===start.x&&cursor.y===start.y)){nodes.unshift(point(cursor.x,cursor.y));const previous=came.get(key(cursor.x,cursor.y));if(!previous)return[];cursor=previous}
  if(canWalk(to))nodes.push(to);
  const smooth:Point[]=[];let anchor=from,index=0;while(index<nodes.length){let far=index;while(far+1<nodes.length&&clearLine(anchor,nodes[far+1]))far++;smooth.push(nodes[far]);anchor=nodes[far];index=far+1}return smooth;
}
