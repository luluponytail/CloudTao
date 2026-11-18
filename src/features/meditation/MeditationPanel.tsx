import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {addPractice} from '../progress/progress';

type BreathPhase='inhale'|'hold'|'exhale';

const BREATH_CYCLE=[
  {id:'inhale' as const,duration:4,zh:'吸气',en:'Inhale'},
  {id:'hold' as const,duration:2,zh:'屏息',en:'Hold'},
  {id:'exhale' as const,duration:6,zh:'呼气',en:'Exhale'},
];

function breathState(elapsed:number){
  const position=elapsed%12;
  if(position<4)return{phase:'inhale' as BreathPhase,remaining:4-position};
  if(position<6)return{phase:'hold' as BreathPhase,remaining:6-position};
  return{phase:'exhale' as BreathPhase,remaining:12-position};
}

export function MeditationPanel(){
 const {i18n}=useTranslation(),zh=i18n.resolvedLanguage==='zh';
 const [minutes,setMinutes]=useState(5),[left,setLeft]=useState(300),[running,setRunning]=useState(false),[done,setDone]=useState(false),[breathElapsed,setBreathElapsed]=useState(0);
 const rewardGranted=useRef(false);
 useEffect(()=>{setLeft(minutes*60);setRunning(false);setDone(false);setBreathElapsed(0);rewardGranted.current=false},[minutes]);
 useEffect(()=>{if(!running)return;const id=window.setInterval(()=>{setLeft(value=>Math.max(0,value-1));setBreathElapsed(value=>value+1)},1000);return()=>window.clearInterval(id)},[running]);
 useEffect(()=>{if(left!==0||done)return;setRunning(false);setDone(true)},[left,done]);
 useEffect(()=>{if(!done||rewardGranted.current)return;rewardGranted.current=true;addPractice({meditationMinutes:minutes},minutes*5)},[done,minutes]);
 const choose=(value:number)=>setMinutes(Math.max(1,Math.min(60,Math.round(value)||1)));
 const reset=()=>{setRunning(false);setLeft(minutes*60);setBreathElapsed(0);setDone(false);rewardGranted.current=false};
 const mm=String(Math.floor(left/60)).padStart(2,'0'),ss=String(left%60).padStart(2,'0');
 const breath=breathState(breathElapsed),phase=BREATH_CYCLE.find(item=>item.id===breath.phase)!;
 return <div className="feature meditation">
  <div className={`breath breath--${breath.phase} ${running?'breathing':''}`} aria-live="polite"><span><b>{zh?phase.zh:phase.en}</b><small>{breath.remaining}{zh?' 秒':' sec'}</small></span></div>
  <div className="breath-phases" aria-label={zh?'呼吸节奏':'Breathing rhythm'}>{BREATH_CYCLE.map(item=><span key={item.id} className={breath.phase===item.id?'active':''}><b>{zh?item.zh:item.en}</b><small>{item.duration}{zh?' 秒':' sec'}</small></span>)}</div>
  <div className="segmented">{[5,10,15].map(value=><button className={minutes===value?'active':''} onClick={()=>choose(value)} key={value}>{value} {zh?'分钟':'min'}</button>)}</div>
  <label className="custom-duration"><span>{zh?'自定义时长':'Custom duration'}</span><input type="number" min="1" max="60" value={minutes} disabled={running} onChange={event=>choose(Number(event.target.value))}/><small>{zh?'分钟（1–60）':'minutes (1–60)'}</small></label>
  <strong className="timer">{mm}:{ss}</strong>
  <p className="breath-instruction">{zh?'吸气 4 秒 · 屏息 2 秒 · 呼气 6 秒':'Inhale 4 sec · hold 2 sec · exhale 6 sec'}</p>
  <div className="feature-actions"><button className="primary-button" onClick={()=>setRunning(!running)} disabled={done}>{running?(zh?'暂停':'Pause'):(zh?'开始静坐':'Begin')}</button><button onClick={reset}>{zh?'重置':'Reset'}</button></div>
  {done&&<p className="completion">✓ {zh?`完成 ${minutes} 分钟静坐，获得 ${minutes*5} 经验。`:`${minutes} minutes complete. ${minutes*5} XP earned.`}</p>}
 </div>;
}
