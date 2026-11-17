'use strict';

// 地图像素会被压缩成固定大小的导航格；数值越小越精确，计算量越大。
const CELL=12;
const PLAYER_RADIUS=10;
const SPEED=130;
const canvas=document.querySelector('#game');
const ctx=canvas.getContext('2d',{alpha:false});
const debugButton=document.querySelector('#debug');
const statusElement=document.querySelector('#status');
const mapImage=new Image();
mapImage.src='./map.png';

let cols=0,rows=0,grid=[],rawGrid=[],debug=false,lastTime=0;
let route=[],routeIndex=0;
const keys=new Set();
const player={x:900,y:1015,radius:PLAYER_RADIUS,moving:false,facing:1};

mapImage.onload=()=>{
  canvas.width=mapImage.naturalWidth;
  canvas.height=mapImage.naturalHeight;
  canvas.style.aspectRatio=`${canvas.width}/${canvas.height}`;
  buildNavigationGrid();
  const spawn=snapToWalkable(player.x,player.y);
  if(spawn){player.x=spawn.x;player.y=spawn.y}
  statusElement.textContent='点击石板路移动 · WASD 可立即打断自动寻路';
  requestAnimationFrame(loop);
};
mapImage.onerror=()=>statusElement.textContent='无法加载 map.png，请确认文件与 index.html 位于同一目录';

function buildNavigationGrid(){
  // 在离屏画布读取原图像素，不污染游戏画面。
  const source=document.createElement('canvas');
  source.width=canvas.width;source.height=canvas.height;
  const sourceContext=source.getContext('2d',{willReadFrequently:true});
  sourceContext.drawImage(mapImage,0,0);
  const pixels=sourceContext.getImageData(0,0,source.width,source.height).data;
  cols=Math.ceil(canvas.width/CELL);rows=Math.ceil(canvas.height/CELL);
  rawGrid=Array.from({length:rows},()=>new Uint8Array(cols));

  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
    // 每格使用 3×3 采样，避免单个高光或花瓣误判整格。
    let blockedVotes=0;
    for(const ox of [.25,.5,.75])for(const oy of [.25,.5,.75]){
      const x=Math.min(source.width-1,Math.floor((gx+ox)*CELL));
      const y=Math.min(source.height-1,Math.floor((gy+oy)*CELL));
      const index=(y*source.width+x)*4;
      if(isBlockedColour(pixels[index],pixels[index+1],pixels[index+2]))blockedVotes++;
    }
    rawGrid[gy][gx]=blockedVotes>=5?1:0;
  }

  // 按角色半径膨胀障碍，角色中心不会贴着水边、墙体或围栏移动。
  const padding=Math.ceil(PLAYER_RADIUS/CELL)+1;
  grid=rawGrid.map(row=>Uint8Array.from(row));
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(rawGrid[y][x]){
    for(let dy=-padding;dy<=padding;dy++)for(let dx=-padding;dx<=padding;dx++){
      if(dx*dx+dy*dy>padding*padding)continue;
      const nx=x+dx,ny=y+dy;if(inGrid(nx,ny))grid[ny][nx]=1;
    }
  }
}

function isBlockedColour(r,g,b){
  const max=Math.max(r,g,b),min=Math.min(r,g,b),saturation=max-min;
  const light=(r+g+b)/3;
  const water=b>92&&b>r*1.08&&g>r*1.03;
  const vegetation=g>r*1.12&&g>b*1.03&&saturation>20;
  const deepShadow=light<56;
  const roofOrTimber=r>g*1.12&&r>b*1.18&&saturation>42;
  const brightStone=light>92&&light<230&&saturation<40;
  const warmPaving=r>105&&g>92&&b>72&&r-b<58&&r-g<34;
  return water||vegetation||deepShadow||roofOrTimber||!(brightStone||warmPaving);
}

function inGrid(x,y){return x>=0&&y>=0&&x<cols&&y<rows}
function worldToGrid(x,y){return{x:Math.max(0,Math.min(cols-1,Math.floor(x/CELL))),y:Math.max(0,Math.min(rows-1,Math.floor(y/CELL)))}}
function gridToWorld(node){return{x:(node.x+.5)*CELL,y:(node.y+.5)*CELL}}
function walkableCell(x,y){return inGrid(x,y)&&grid[y][x]===0}
function canStand(x,y){const cell=worldToGrid(x,y);return walkableCell(cell.x,cell.y)}

function snapToWalkable(x,y){
  const origin=worldToGrid(x,y);
  if(walkableCell(origin.x,origin.y))return gridToWorld(origin);
  for(let radius=1;radius<Math.max(cols,rows);radius++){
    let best=null,bestDistance=Infinity;
    for(let gy=origin.y-radius;gy<=origin.y+radius;gy++)for(let gx=origin.x-radius;gx<=origin.x+radius;gx++){
      if(Math.abs(gx-origin.x)!==radius&&Math.abs(gy-origin.y)!==radius)continue;
      if(!walkableCell(gx,gy))continue;
      const point=gridToWorld({x:gx,y:gy}),distance=Math.hypot(point.x-x,point.y-y);
      if(distance<bestDistance){bestDistance=distance;best=point}
    }
    if(best)return best;
  }
  return null;
}

class MinHeap{
  constructor(){this.items=[]}
  push(item){this.items.push(item);let i=this.items.length-1;while(i>0){const p=(i-1)>>1;if(this.items[p].f<=item.f)break;this.items[i]=this.items[p];i=p}this.items[i]=item}
  pop(){if(!this.items.length)return null;const root=this.items[0],last=this.items.pop();if(this.items.length){let i=0;while(true){let left=i*2+1,right=left+1;if(left>=this.items.length)break;let child=right<this.items.length&&this.items[right].f<this.items[left].f?right:left;if(this.items[child].f>=last.f)break;this.items[i]=this.items[child];i=child}this.items[i]=last}return root}
  get size(){return this.items.length}
}

function findPath(startWorld,endWorld){
  const start=worldToGrid(startWorld.x,startWorld.y),goal=worldToGrid(endWorld.x,endWorld.y);
  if(!walkableCell(start.x,start.y)||!walkableCell(goal.x,goal.y))return[];
  const total=cols*rows,gScore=new Float32Array(total);gScore.fill(Infinity);
  const parent=new Int32Array(total);parent.fill(-1);
  const closed=new Uint8Array(total),heap=new MinHeap();
  const startId=start.y*cols+start.x,goalId=goal.y*cols+goal.x;
  gScore[startId]=0;heap.push({x:start.x,y:start.y,id:startId,f:0});
  const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(heap.size){
    const current=heap.pop();if(closed[current.id])continue;closed[current.id]=1;
    if(current.id===goalId)break;
    for(const [dx,dy] of directions){
      const nx=current.x+dx,ny=current.y+dy;if(!walkableCell(nx,ny))continue;
      if(dx&&dy&&(!walkableCell(current.x+dx,current.y)||!walkableCell(current.x,current.y+dy)))continue;
      const id=ny*cols+nx;if(closed[id])continue;
      const tentative=gScore[current.id]+(dx&&dy?1.4142:1);
      if(tentative>=gScore[id])continue;
      gScore[id]=tentative;parent[id]=current.id;
      const h=Math.hypot(goal.x-nx,goal.y-ny);
      heap.push({x:nx,y:ny,id,f:tentative+h});
    }
  }
  if(parent[goalId]===-1&&goalId!==startId)return[];
  const nodes=[];let id=goalId;
  while(id!==-1){nodes.unshift({x:id%cols,y:Math.floor(id/cols)});if(id===startId)break;id=parent[id]}
  return smoothPath(nodes.map(gridToWorld));
}

function lineWalkable(a,b){
  const distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance/(CELL*.4)));
  for(let i=0;i<=steps;i++){const t=i/steps;if(!canStand(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false}
  return true;
}

function smoothPath(points){
  if(points.length<3)return points;
  const result=[points[0]];let anchor=0;
  while(anchor<points.length-1){let far=points.length-1;while(far>anchor+1&&!lineWalkable(points[anchor],points[far]))far--;result.push(points[far]);anchor=far}
  return result;
}

function canvasPoint(event){
  const rect=canvas.getBoundingClientRect();
  return{x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
}

canvas.addEventListener('click',event=>{
  const clicked=canvasPoint(event),target=snapToWalkable(clicked.x,clicked.y);
  if(!target)return;
  route=findPath(player,target);routeIndex=route.length>1?1:0;
  statusElement.textContent=route.length?'正在沿规划路线移动':'该位置暂时无法到达';
});

window.addEventListener('keydown',event=>{
  if(!['w','a','s','d','W','A','S','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
  keys.add(event.key.toLowerCase());route=[];routeIndex=0;statusElement.textContent='键盘自由探索';event.preventDefault();
});
window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
debugButton.addEventListener('click',()=>{debug=!debug;debugButton.classList.toggle('active',debug);debugButton.textContent=debug?'隐藏碰撞网格':'显示碰撞网格'});

function update(dt){
  let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
  let dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  player.moving=false;
  if(dx||dy){
    const length=Math.hypot(dx,dy);dx/=length;dy/=length;moveWithCollision(dx*SPEED*dt,dy*SPEED*dt);player.moving=true;
  }else if(routeIndex<route.length){
    const target=route[routeIndex],vx=target.x-player.x,vy=target.y-player.y,distance=Math.hypot(vx,vy),step=SPEED*dt;
    if(distance<=step+2){player.x=target.x;player.y=target.y;routeIndex++;if(routeIndex>=route.length){route=[];routeIndex=0;statusElement.textContent='已抵达'}}
    else{moveWithCollision(vx/distance*step,vy/distance*step);player.moving=true}
  }
  if(dx)player.facing=Math.sign(dx);
}

function moveWithCollision(dx,dy){
  // 分轴检测允许角色沿障碍边缘滑动，不会在墙角永久卡死。
  const nextX=player.x+dx;if(canStand(nextX,player.y))player.x=nextX;
  const nextY=player.y+dy;if(canStand(player.x,nextY))player.y=nextY;
}

function render(time){
  ctx.drawImage(mapImage,0,0);
  if(debug){
    ctx.fillStyle='rgba(220,40,40,.32)';
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(grid[y][x])ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
  }
  if(route.length&&routeIndex<route.length){
    ctx.save();ctx.strokeStyle='#f3cf62';ctx.lineWidth=4;ctx.setLineDash([13,9]);ctx.lineDashOffset=-(time/35)%22;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(player.x,player.y);
    for(let i=routeIndex;i<route.length;i++)ctx.lineTo(route[i].x,route[i].y);
    ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.translate(player.x,player.y);ctx.scale(player.facing,1);
  const bob=player.moving?Math.sin(time/90)*2:0;ctx.translate(0,bob);
  ctx.fillStyle='#202d2a';ctx.beginPath();ctx.ellipse(0,10,13,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d6b18d';ctx.beginPath();ctx.arc(0,-18,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#315b50';ctx.fillRect(-10,-10,20,27);ctx.fillStyle='#c8a46a';ctx.fillRect(-10,0,20,4);
  ctx.restore();
}

function loop(time){
  const dt=Math.min(.04,(time-lastTime)/1000||0);lastTime=time;update(dt);render(time);requestAnimationFrame(loop);
}
