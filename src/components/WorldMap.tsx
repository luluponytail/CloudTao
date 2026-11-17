import {useState} from 'react';
import {gameEvents} from '../game/events';
import type {AreaId} from '../game/worldData';
import {roadEdges} from '../game/systems/roadMovement';

const destinations:Array<{id:AreaId;x:number;y:number;zh:string;en:string}>=[
  {id:'bamboo',x:94,y:14,zh:'静心洞',en:'Meditation Cave'},
  {id:'wealth',x:24,y:24,zh:'财神殿',en:'Wealth'},
  {id:'sanqing',x:50,y:34,zh:'三清殿',en:'Sanqing'},
  {id:'library',x:82,y:36,zh:'藏经阁',en:'Library'},
  {id:'oracle',x:17,y:43,zh:'问道阁',en:'Oracle'},
  {id:'taichi',x:50,y:53,zh:'太极场',en:'Tai Chi'},
  {id:'wish',x:12,y:65,zh:'祈福台',en:'Wishes'},
  {id:'garden',x:86,y:64,zh:'修行园',en:'Garden'},
  {id:'gate',x:50,y:91,zh:'山门',en:'Gate'},
];

export function WorldMap({zh}:{zh:boolean}){
  const[open,setOpen]=useState(false);
  const go=(id:AreaId)=>{gameEvents.emit('navigateArea',{id});setOpen(false)};
  return <aside className={`world-map ${open?'open':''}`}>
    <button className="world-map-toggle" onClick={()=>setOpen(value=>!value)} aria-expanded={open}><span>图</span><b>{zh?'全局地图':'World Map'}</b></button>
    {open&&<div className="world-map-sheet">
      <div className="world-map-title"><b>{zh?'云上道观全图':'Cloud Tao Map'}</b><small>{zh?'点击地点自动沿路前往':'Select a place for guided travel'}</small></div>
      <div className="world-map-image"><img src="./assets/maps/cloud-tao-main-map-v4.webp" alt=""/>
        <svg className="world-route-network" viewBox="0 0 1800 1120" role="img" aria-label={zh?'全局步行路线':'Global walking routes'}>
          {roadEdges.map(edge=><polyline key={edge.id} points={edge.points.map(point=>`${point.x},${point.y}`).join(' ')} />)}
          {roadEdges.flatMap(edge=>edge.points).filter((point,index,all)=>all.findIndex(other=>other.x===point.x&&other.y===point.y)===index).map(point=><circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="7"/>)}
        </svg>
        {destinations.map(place=><button key={place.id} style={{left:`${place.x}%`,top:`${place.y}%`}} onClick={()=>go(place.id)} title={zh?place.zh:place.en}><i/>{zh?place.zh:place.en}</button>)}
      </div>
      <div className="world-map-legend"><span><i/>{zh?'规划步行路线':'Planned walking route'}</span><span><i/>{zh?'转向节点':'Turn node'}</span></div>
    </div>}
  </aside>;
}
