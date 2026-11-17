import { roadNodes, type RoadNode } from './roadNavigation';

export interface RoadEdge { id:string; from:string; to:string; points:Array<{x:number;y:number}>; length:number }
export interface RoadPosition { edgeId:string; t:number }

const nodeById=new Map(roadNodes.map(node=>[node.id,node]));

function edgeId(a:string,b:string){return a<b?`${a}--${b}`:`${b}--${a}`}

// Hand-calibrated bends follow the pale stone paths in the production map.
// In particular, the western path skirts the pond instead of cutting through
// it and the eastern branches follow the curved garden/library approaches.
const bends:Record<string,Array<{x:number;y:number}>>={
  'bridge--gatePath':[{x:900,y:760}],
  'courtSouth--wishA':[{x:805,y:670},{x:745,y:720}],
  'wishA--wishB':[{x:635,y:755},{x:560,y:742}],
  // Continue west along the bridge centreline. The former control points ran
  // past the pavilion entrance and then doubled back to it.
  'wishB--wishC':[{x:470,y:722},{x:442,y:713}],
  'wish--wishC':[],
  // Ordered west-to-east and lowered through the open western railing gap.
  // The previous reversed bend order caused a visible out-and-back loop.
  'oracleA--taichi':[{x:720,y:535},{x:805,y:548}],
  'oracleA--oracleB':[{x:585,y:494},{x:515,y:486}],
  'oracle--oracleB':[{x:400,y:472},{x:345,y:466}],
  'oracleA--wealthB':[{x:625,y:465},{x:600,y:425},{x:575,y:385},{x:550,y:345}],
  'wealth--wealthB':[{x:482,y:276},{x:512,y:300}],
  'libraryA--taichi':[{x:1050,y:508},{x:985,y:520}],
  'libraryA--libraryB':[{x:1160,y:489},{x:1205,y:478}],
  'library--libraryB':[{x:1420,y:432},{x:1345,y:450}],
  'courtSouth--gardenA':[{x:980,y:598},{x:1050,y:580}],
  'gardenA--gardenB':[{x:1170,y:590},{x:1230,y:615}],
  'garden--gardenB':[{x:1470,y:668},{x:1380,y:650}],
  'bambooA--library':[{x:1680,y:420},{x:1620,y:445},{x:1550,y:445}],
  'bambooA--bambooB':[{x:1690,y:360},{x:1690,y:325}],
  'bamboo--bambooB':[{x:1710,y:215},{x:1690,y:250}],
};

function polylineLength(points:Array<{x:number;y:number}>){let total=0;for(let i=1;i<points.length;i++)total+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);return total}

export const roadEdges:RoadEdge[]=roadNodes.flatMap(node=>node.links
  .filter(link=>node.id<link)
  .map(link=>{
    const other=nodeById.get(link)!;
    const id=edgeId(node.id,link),via=bends[id]||[];
    const points=[{x:node.x,y:node.y},...via,{x:other.x,y:other.y}];
    return{id,from:node.id,to:link,points,length:polylineLength(points)};
  }));

const edgeById=new Map(roadEdges.map(edge=>[edge.id,edge]));
const edgesAtNode=new Map<string,RoadEdge[]>();
for(const edge of roadEdges){
  edgesAtNode.set(edge.from,[...(edgesAtNode.get(edge.from)||[]),edge]);
  edgesAtNode.set(edge.to,[...(edgesAtNode.get(edge.to)||[]),edge]);
}

function projectToEdge(x:number,y:number,edge:RoadEdge){
  let travelled=0,best={t:0,x:edge.points[0].x,y:edge.points[0].y,distance:Infinity};
  for(let i=1;i<edge.points.length;i++){
    const a=edge.points[i-1],b=edge.points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
    const local=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(len*len)));
    const px=a.x+dx*local,py=a.y+dy*local,distance=Math.hypot(x-px,y-py);
    if(distance<best.distance)best={t:(travelled+local*len)/edge.length,x:px,y:py,distance};
    travelled+=len;
  }
  return best;
}

export function locateRoadPosition(x:number,y:number):RoadPosition{
  let bestEdge=roadEdges[0],bestT=0,bestDistance=Infinity;
  for(const edge of roadEdges){const projection=projectToEdge(x,y,edge);if(projection.distance<bestDistance){bestDistance=projection.distance;bestEdge=edge;bestT=projection.t}}
  return{edgeId:bestEdge.id,t:bestT};
}

export function roadPoint(position:RoadPosition){
  const edge=edgeById.get(position.edgeId)!;
  let distance=Math.max(0,Math.min(1,position.t))*edge.length;
  for(let i=1;i<edge.points.length;i++){const a=edge.points[i-1],b=edge.points[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(distance<=len||i===edge.points.length-1){const t=len?distance/len:0;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}}distance-=len}
  return edge.points[edge.points.length-1];
}

function tangentAt(edge:RoadEdge,t:number){
  let distance=Math.max(0,Math.min(1,t))*edge.length;
  for(let i=1;i<edge.points.length;i++){const a=edge.points[i-1],b=edge.points[i],len=Math.hypot(b.x-a.x,b.y-a.y)||1;if(distance<=len||i===edge.points.length-1)return{x:(b.x-a.x)/len,y:(b.y-a.y)/len};distance-=len}
  return{x:0,y:1};
}

function orientedTangent(edge:RoadEdge,nodeId:string){
  const tangent=tangentAt(edge,edge.from===nodeId?0:1),sign=edge.from===nodeId?1:-1;
  return{x:tangent.x*sign,y:tangent.y*sign};
}

function chooseEdge(nodeId:string,input:{x:number;y:number},previousEdgeId:string){
  let best:RoadEdge|undefined,bestDot=-Infinity;
  for(const edge of edgesAtNode.get(nodeId)||[]){
    const tangent=orientedTangent(edge,nodeId),dot=tangent.x*input.x+tangent.y*input.y;
    const penalty=edge.id===previousEdgeId ? .15 : 0;
    if(dot-penalty>bestDot){bestDot=dot-penalty;best=edge}
  }
  return bestDot>.12?best:undefined;
}

export function advanceRoadPosition(position:RoadPosition,input:{x:number;y:number},distance:number):RoadPosition{
  let edge=edgeById.get(position.edgeId)!;
  const length=Math.hypot(input.x,input.y)||1,ix=input.x/length,iy=input.y/length;
  // Let an intended turn take over slightly before the exact mathematical
  // junction. Otherwise a visitor holding left at the western fork remains on
  // the nearly vertical incoming edge forever because the input has no forward
  // component along that edge.
  const junctionSnapDistance=72;
  const distanceFromStart=position.t*edge.length;
  const distanceFromEnd=(1-position.t)*edge.length;
  const nearNode=distanceFromStart<=junctionSnapDistance
    ? edge.from
    : distanceFromEnd<=junctionSnapDistance ? edge.to : undefined;
  if(nearNode){
    const turn=chooseEdge(nearNode,{x:ix,y:iy},edge.id);
    if(turn&&turn.id!==edge.id){
      const distanceToNode=nearNode===edge.from?distanceFromStart:distanceFromEnd;
      if(distanceToNode>distance){
        const delta=distance/edge.length*(nearNode===edge.from?-1:1);
        return{edgeId:edge.id,t:Math.max(0,Math.min(1,position.t+delta))};
      }
      const startsAtNode=turn.from===nearNode;
      const remaining=Math.max(0,distance-distanceToNode);
      const next={edgeId:turn.id,t:startsAtNode?remaining/turn.length:1-remaining/turn.length};
      return{edgeId:next.edgeId,t:Math.max(0,Math.min(1,next.t))};
    }
  }
  const tangent=tangentAt(edge,position.t);
  let direction=Math.sign(ix*tangent.x+iy*tangent.y);
  if(!direction)return position;
  let t=position.t+direction*distance/edge.length;
  if(t>=0&&t<=1)return{edgeId:edge.id,t};
  let remaining=(t>1?t-1:-t)*edge.length;
  const nodeId=t>1?edge.to:edge.from;
  const next=chooseEdge(nodeId,{x:ix,y:iy},edge.id);
  if(!next)return{edgeId:edge.id,t:t>1?1:0};
  edge=next;
  const startsAtNode=edge.from===nodeId;
  t=startsAtNode?remaining/edge.length:1-remaining/edge.length;
  return{edgeId:edge.id,t:Math.max(0,Math.min(1,t))};
}

export function nodeForPosition(position:RoadPosition){
  const edge=edgeById.get(position.edgeId)!;
  return position.t<.5?nodeById.get(edge.from)!:nodeById.get(edge.to)!;
}

export function edgeForPosition(position:RoadPosition){return edgeById.get(position.edgeId)!}

export function edgeBetween(a:string,b:string){return edgeById.get(edgeId(a,b))}

export function expandedRoadPath(nodePath:Array<{id:string}>){
  const result:Array<{x:number;y:number}>=[];
  for(let i=1;i<nodePath.length;i++){
    const edge=edgeBetween(nodePath[i-1].id,nodePath[i].id);if(!edge)continue;
    const points=edge.from===nodePath[i-1].id?edge.points:[...edge.points].reverse();
    result.push(...points.slice(result.length?1:0));
  }
  return result;
}

export function expandedRoadPathFrom(position:RoadPosition,nodePath:Array<{id:string}>){
  if(!nodePath.length)return[];
  const edge=edgeById.get(position.edgeId)!;
  const destination=nodePath[0].id;
  const current=roadPoint(position);
  let prefix:Array<{x:number;y:number}>=[current];
  if(destination===edge.from){
    const travelled=position.t*edge.length;let distance=0;
    const before:Array<{x:number;y:number}>=[];
    for(let i=1;i<edge.points.length;i++){distance+=Math.hypot(edge.points[i].x-edge.points[i-1].x,edge.points[i].y-edge.points[i-1].y);if(distance<travelled)before.push(edge.points[i])}
    prefix=[current,...before.reverse(),edge.points[0]];
  }else if(destination===edge.to){
    const travelled=position.t*edge.length;let distance=0;const after:Array<{x:number;y:number}>=[];
    for(let i=1;i<edge.points.length;i++){distance+=Math.hypot(edge.points[i].x-edge.points[i-1].x,edge.points[i].y-edge.points[i-1].y);if(distance>travelled)after.push(edge.points[i])}
    prefix=[current,...after];
  }
  return[...prefix,...expandedRoadPath(nodePath).slice(1)];
}

export function nodePoint(node:RoadNode){return{x:node.x,y:node.y}}
