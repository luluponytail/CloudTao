import { loadProgress } from '../progress/progress';
export interface DailyTask { id:string; zh:string; en:string; xp:number }
export const dailyTasks:DailyTask[]=[
 {id:'breathe',zh:'完成三轮缓慢呼吸',en:'Complete three slow breaths',xp:10},
 {id:'stretch',zh:'完成一次基础舒展',en:'Complete a gentle stretch',xp:15},
 {id:'wisdom',zh:'阅读一句道家智慧',en:'Read one Taoist reflection',xp:5},
];
const today=()=>new Date().toISOString().slice(0,10);const key=()=>`cloud-tao-daily-${today()}`;
export const loadDaily=():string[]=>{try{return JSON.parse(localStorage.getItem(key())||'[]')}catch{return[]}};
export function completeDaily(id:string){const done=[...new Set([...loadDaily(),id])];localStorage.setItem(key(),JSON.stringify(done));const p=loadProgress();const task=dailyTasks.find(t=>t.id===id);if(task&&!loadDaily().includes(id))p.xp+=task.xp;return done}
