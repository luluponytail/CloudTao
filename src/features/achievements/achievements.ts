import type {PracticeProgress} from '../progress/progress';
export interface Achievement {id:string;icon:string;zh:string;en:string;unlocked:(p:PracticeProgress,secrets:number)=>boolean}
export const achievements:Achievement[]=[
 {id:'gate',icon:'門',zh:'初入道门',en:'Entering the Way',unlocked:()=>true},{id:'oracle',icon:'易',zh:'问道初心',en:'First Oracle',unlocked:p=>p.oracleCount>0},{id:'meditate',icon:'静',zh:'静心修习者',en:'Quiet Practitioner',unlocked:p=>p.meditationMinutes>=5},{id:'taichi',icon:'☯',zh:'太极初学者',en:'Tai Chi Beginner',unlocked:p=>p.taichiMinutes>=3},{id:'explore',icon:'竹',zh:'竹林探索者',en:'Bamboo Explorer',unlocked:(_,s)=>s>=3},{id:'seven',icon:'七',zh:'七日修行者',en:'Seven-day Practitioner',unlocked:p=>p.xp>=350}
];
