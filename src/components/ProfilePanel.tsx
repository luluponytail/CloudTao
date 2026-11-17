import {useTranslation} from 'react-i18next';
import {achievements} from '../features/achievements/achievements';
import type {PracticeProgress} from '../features/progress/progress';
import {loadSanqingState} from '../features/sanqing/sanqing';

interface Props { identityName?:string; progress:PracticeProgress; secrets:number; onRename:()=>void; onClose:()=>void; onClear:()=>void }
export function ProfilePanel({identityName,progress,secrets,onRename,onClose,onClear}:Props){
 const {i18n}=useTranslation();const zh=i18n.resolvedLanguage==='zh';
 const templeSeals=loadSanqingState().seals;
 return <div className="modal-backdrop"><section className="profile-panel" role="dialog" aria-modal="true" aria-label={zh?'修行档案':'Practice profile'}>
  <p className="eyebrow">{zh?'云上题名':'NAME REMEMBERED BY THE MOUNTAIN'}</p><h2>{identityName||(zh?'云游客':'Wanderer')}</h2><button className="rename-button" onClick={onRename}>{zh?'重新题名':'Change name'}</button>
  <div className="stats"><span><b>{progress.xp}</b>XP</span><span><b>{progress.oracleCount}</b>{zh?'问道':'Oracles'}</span><span><b>{progress.meditationMinutes}</b>{zh?'静坐分钟':'Meditation min'}</span><span><b>{progress.taichiMinutes}</b>{zh?'太极分钟':'Tai Chi min'}</span></div>
  <h3>{zh?'成就':'Achievements'}</h3><div className="badges">{achievements.map(a=>{const on=a.unlocked(progress,secrets);return <div className={on?'unlocked':'locked'} key={a.id}><i>{a.icon}</i><span>{zh?a.zh:a.en}</span></div>})}</div>
  <h3>{zh?'殿宇印记':'Temple seals'}</h3>
  <div className="temple-seals">{templeSeals.length?templeSeals.map(seal=><div key={seal.id}><i>{seal.hidden?'◇':'印'}</i><b>{zh?seal.nameZh:seal.nameEn}</b><small>{zh?seal.descriptionZh:seal.descriptionEn}</small></div>):<p>{zh?'完成殿宇修行后，印记会收存在这里。':'Complete a hall practice to keep its seal here.'}</p>}</div>
  <details><summary>{zh?'隐私与本地数据':'Privacy & local data'}</summary><p>{zh?'名字、修行记录和心愿只保存在此浏览器中，不会自动公开。':'Your name, practice records, and wishes remain in this browser and are never published automatically.'}</p><button className="danger-button" onClick={onClear}>{zh?'清除全部本地数据':'Clear all local data'}</button></details>
  <button className="primary-button" onClick={onClose}>{zh?'返回':'Back'}</button>
 </section></div>
}
