import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { completeSanqing, loadSanqingState, localDateKey, saveSanqingState, todayRecord, type DeityId } from './sanqing';
import {supportConfig} from '../../config/support';
import '../../styles/sanqing-support.css';

const DEITIES: Array<{id:DeityId; zh:string; en:string; toolZh:string; toolEn:string; meaningZh:string; meaningEn:string}> = [
  { id:'yuanshi', zh:'元始天尊', en:'Yuanshi Tianzun', toolZh:'宝珠', toolEn:'Pearl', meaningZh:'象征本源、开端与澄明。', meaningEn:'The source of beginnings, clarity, and original possibility.' },
  { id:'lingbao', zh:'灵宝天尊', en:'Lingbao Tianzun', toolZh:'如意', toolEn:'Ruyi', meaningZh:'象征秩序、关系与万物和合。', meaningEn:'The harmony of relationships, order, and the living world.' },
  { id:'daode', zh:'道德天尊', en:'Daode Tianzun', toolZh:'法扇', toolEn:'Ritual fan', meaningZh:'象征智慧、自然与少私寡欲。', meaningEn:'Wisdom, naturalness, and freedom from needless striving.' },
];

const QUESTIONS = [
  ['我现在真正想开始的是什么？','What do I truly wish to begin?'],
  ['哪段关系需要恢复平衡？','Which relationship needs greater balance?'],
  ['哪件事可以少一些强求？','Where could I allow less forcing?'],
] as const;

export function SanqingPanel(){
  const {i18n}=useTranslation();
  const zh=i18n.resolvedLanguage==='zh';
  const initial=todayRecord(loadSanqingState());
  const [observed,setObserved]=useState<DeityId[]>(initial.observed);
  const [incense,setIncense]=useState(initial.incenseOffered);
  const [question,setQuestion]=useState(initial.reflectionQuestion||'');
  const [reflection,setReflection]=useState(initial.reflectionText||'');
  const [completed,setCompleted]=useState(initial.completed);
  const [reward,setReward]=useState(0);
  const [message,setMessage]=useState('');
  const correctOrder=useMemo(()=>observed.slice(0,3).join(',')==='yuanshi,lingbao,daode',[observed]);
  const allObserved=DEITIES.every(item=>observed.includes(item.id));

  const savePartial=(nextObserved:DeityId[],nextIncense=incense)=>{
    const state=loadSanqingState(),date=localDateKey();
    state.records[date]={...todayRecord(state,date),date,observed:nextObserved,incenseOffered:nextIncense};
    saveSanqingState(state);
  };

  const observe=(id:DeityId)=>{
    if(!observed.includes(id)){const next=[...observed,id];setObserved(next);savePartial(next)}
    const deity=DEITIES.find(item=>item.id===id)!;
    setMessage(zh?`${deity.zh} · ${deity.toolZh}：${deity.meaningZh}`:`${deity.en} · ${deity.toolEn}: ${deity.meaningEn}`);
  };

  const finish=()=>{
    if(!allObserved||!question)return;
    const result=completeSanqing({date:localDateKey(),observed,incenseOffered:incense,reflectionQuestion:question,reflectionText:reflection.trim(),completed:true},correctOrder);
    setCompleted(true);setReward(result.xpAwarded);
  };

  return <div className="feature sanqing-feature">
    <p className="sanqing-intro">{zh?'依次观礼三清，留下一则只保存在本机的今日省思。':'Contemplate the Three Pure Ones, then keep a private reflection on this device.'}</p>
    <div className="deity-grid">
      {DEITIES.map((deity,index)=><button key={deity.id} className={observed.includes(deity.id)?'observed':''} onClick={()=>observe(deity.id)}>
        <i>{index===0?'●':index===1?'◆':'◐'}</i><b>{zh?deity.zh:deity.en}</b><small>{zh?deity.toolZh:deity.toolEn}</small><span>{observed.includes(deity.id)?'✓':''}</span>
      </button>)}
    </div>
    {message&&<div className="deity-teaching" role="status">{message}</div>}
    <a className={`incense-button incense-support-button ${incense?'offered':''}`} href={supportConfig.paypalUrl} target="_blank" rel="noopener noreferrer" onClick={()=>{setIncense(true);savePartial(observed,true)}}>
      <span className="incense-smoke">〰</span>{incense?(zh?'再次上香并支持云上道观':'Offer incense & support again'):(zh?'上香并支持云上道观':'Offer incense & support Cloud Tao')}
    </a>
    {allObserved?<section className="reflection-scroll">
      <h3>{zh?'今日省思':'Today’s reflection'}</h3>
      <div className="reflection-questions">{QUESTIONS.map(([cn,en])=><button key={cn} className={question===(zh?cn:en)?'active':''} onClick={()=>setQuestion(zh?cn:en)}>{zh?cn:en}</button>)}</div>
      <textarea maxLength={240} value={reflection} onChange={event=>setReflection(event.target.value)} placeholder={zh?'可写下几句话，也可以留白……':'Write a few private words, or leave this blank…'}/>
      <small>{reflection.length}/240 · {zh?'仅保存在当前浏览器':'stored only in this browser'}</small>
      <button className="primary-button" disabled={!question||completed} onClick={finish}>{completed?(zh?'今日省思已完成':'Reflection complete'):(zh?'收存今日省思':'Keep today’s reflection')}</button>
    </section>:<p className="notice">{zh?`已观礼 ${observed.length}/3，观礼三清后开启今日省思。`:`Observed ${observed.length}/3. Reflection opens after all three.`}</p>}
    {completed&&<div className="sanqing-complete"><b>✦ {zh?'三清殿印记':'Sanqing Hall Seal'}</b><p>{reward?`${zh?'获得':'Earned'} ${reward} XP`:(zh?'今日奖励已经领取，仍可再次观礼。':'Today’s reward was already received; you may still revisit.')}</p>{correctOrder&&<p>◇ {zh?'隐藏印记：三清道印':'Hidden seal: Seal of the Three Pure Ones'}</p>}</div>}
  </div>;
}
