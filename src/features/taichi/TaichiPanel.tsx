import { useEffect,useRef,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { forms } from '../../data/taichi/forms';
import { addPractice } from '../progress/progress';
import { ShareActions } from '../sharing/ShareActions';
import {AmazonBookLink} from '../support/SupportPanel';

const phaseCues=[
 [['松肩沉胯','双臂前举','屈膝下按'],['Settle shoulders','Raise both arms','Sink and press']],
 [['收脚抱球','迈步移重','上下分掌'],['Gather the ball','Step and shift','Separate palms']],
 [['移重收脚','提手转腰','虚步定势'],['Shift and close','Lift and turn','Set empty stance']],
 [['转腰收掌','迈步搂膝','弓步前推'],['Turn and gather','Step and brush','Bow stance push']],
 [['转腰云掌','侧步移重','换掌连贯'],['Turn cloud palm','Side-step weight','Change palms']],
 [['双掌回收','缓缓下按','并步归静'],['Draw palms in','Lower softly','Return to stillness']],
] as const;

export function TaichiPanel(){
 const {i18n}=useTranslation(),zh=i18n.resolvedLanguage==='zh';
 const [index,setIndex]=useState(0),[phase,setPhase]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(.75),[completed,setCompleted]=useState(false);
 const rewardGranted=useRef(false);
 useEffect(()=>{if(!playing)return;const id=window.setInterval(()=>{if(phase<2)setPhase(phase+1);else if(index<forms.length-1){setIndex(index+1);setPhase(0)}else{setPlaying(false);setCompleted(true)}},1800/speed);return()=>window.clearInterval(id)},[playing,speed,index,phase]);
 useEffect(()=>{if(!completed||rewardGranted.current)return;rewardGranted.current=true;addPractice({taichiMinutes:3},30)},[completed]);
 const f=forms[index],cue=phaseCues[index][zh?0:1][phase];
 const select=(next:number)=>{setIndex(Math.max(0,Math.min(forms.length-1,next)));setPhase(0);setPlaying(false)};
 return <div className="feature taichi">
  <div className="taichi-stage">
   <div className={`form-figure form-${index} phase-${phase} ${playing?'is-practicing':''}`} role="img" aria-label={`${zh?f.zh:f.en} · ${cue}`}/>
   <span className="motion-direction" aria-hidden="true">↝</span>
   <div className="weight-marker"><i/><i/><small>{zh?'重心':'WEIGHT'}</small></div>
  </div>
  <div className="phase-strip">{[0,1,2].map(step=><span key={step} className={step===phase?'active':''}>{step+1}<small>{phaseCues[index][zh?0:1][step]}</small></span>)}</div>
  <small className="notice">{zh?'关键姿势、运动方向与节拍示意；请在舒适范围内缓慢练习，不替代专业老师的面对面指导。':'Key posture, direction and timing guide. Move slowly within comfort; this does not replace in-person instruction.'}</small>
  <h3>{index+1}/6 · {zh?f.zh:f.en}</h3>
  <p>{zh?f.tipZh:f.tipEn}</p>
  <b>{zh?'当前阶段：':'Current phase: '}{cue}</b>
  <p className="breath-cue"><i className={playing?'breath-pulse':''}/>{zh?'呼吸：':'Breath: '}{zh?f.breathZh:f.breathEn}</p>
  <div className="progress-bar"><i style={{width:`${((index*3+phase+1)/(forms.length*3))*100}%`}}/></div>
  <div className="feature-actions"><button onClick={()=>select(index-1)}>‹</button><button className="primary-button" onClick={()=>setPlaying(!playing)}>{playing?(zh?'暂停':'Pause'):(zh?'开始跟练':'Follow')}</button><button onClick={()=>select(index+1)}>›</button><select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value=".5">0.5×</option><option value=".75">0.75×</option><option value="1">1×</option></select></div>
  {completed&&<><p className="completion">✦ {zh?'完成六式关键姿势跟练，获得 30 经验。':'Six-form key-posture practice complete. 30 XP earned.'}</p><ShareActions title={zh?'今日太极修行':'Today’s Tai Chi Practice'} detail={zh?'完成六式太极入门练习':'Completed the six-form introductory practice'}/></>}
  <div className="taichi-support"><AmazonBookLink compact/></div>
 </div>
}
