import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {gameEvents} from '../../game/events';
import {loadProgress,saveProgress} from '../progress/progress';
import './wealth.css';

const intentions=[
  ['勤业有成','Steady work'],
  ['生意守信','Honest business'],
  ['收支有度','Wise stewardship'],
  ['机缘明辨','Clear opportunities'],
] as const;

export function WealthPanel(){
  const {i18n}=useTranslation();const zh=i18n.resolvedLanguage==='zh';
  const [intention,setIntention]=useState(0);const [offered,setOffered]=useState(false);
  const offer=()=>{
    if(offered)return;
    const day=new Date().toISOString().slice(0,10),key='cloud-tao-wealth-incense';
    if(localStorage.getItem(key)!==day){const progress=loadProgress();progress.xp+=8;saveProgress(progress);localStorage.setItem(key,day)}
    setOffered(true);
    gameEvents.emit('wealthBlessing',{message:zh?'财由勤聚，福以德生；愿你明辨机缘，取用有度。':'May honest effort, clear judgment, and wise stewardship guide your prosperity.'});
  };
  return <div className={`feature wealth-feature ${offered?'wealth-offered':''}`}>
    <div className="wealth-altar" aria-hidden="true"><span>〰</span><i/><b>财</b></div>
    <p>{zh?'在赵公明元帅像前选择一份心愿，静心敬香。求财是对勤勉、诚信与善用所得的提醒，并不保证现实收益。':'Choose an intention before Marshal Zhao Gongming and offer incense. This is a reflection on effort, integrity, and wise use of resources—not a promise of financial results.'}</p>
    <div className="wealth-intentions" role="group" aria-label={zh?'选择求财心愿':'Choose an intention'}>{intentions.map(([cn,en],index)=><button key={cn} className={intention===index?'active':''} onClick={()=>setIntention(index)}>{zh?cn:en}</button>)}</div>
    <small className="wealth-support-note">{zh?'敬香祝愿是一种文化体验，不代表任何财务收益承诺。':'The incense blessing is a cultural reflection and does not promise financial results.'}</small>
    {offered&&<div className="wealth-blessing" role="status"><b>✦ {zh?'财神赐语':'A word for prosperity'}</b><p>{zh?'财由勤聚，福以德生。守正而行，量入为出，所得方能长久。':'Prosperity grows through steady effort and integrity. Act fairly, live within your means, and let what you gain endure.'}</p><small>+8 XP · {zh?'每日首次敬香奖励':'first offering reward each day'}</small></div>}
    <button className={`primary-button wealth-incense ${offered?'offered':''}`} onClick={offer}>{offered?(zh?'今日已敬香':'Incense offered today'):(zh?`敬香 · ${intentions[intention][0]}`:`Offer incense · ${intentions[intention][1]}`)}</button>
  </div>;
}
