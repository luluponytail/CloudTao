import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameCanvas } from './components/GameCanvas';
import { Joystick } from './components/Joystick';
import { AreaPanel } from './components/AreaPanel';
import { gameEvents } from './game/events';
import type { AreaId } from './game/worldData';
import { interactionText } from './components/interactionText';
import { useAmbience } from './features/audio/useAmbience';
import { loadProgress, titleForXp, type PracticeProgress } from './features/progress/progress';
import { ProfilePanel } from './components/ProfilePanel';
import { IdentityPanel } from './components/IdentityPanel';
import { loadIdentity, type TaoIdentity } from './features/identity/identity';
import { NpcDialogue } from './components/NpcDialogue';
import { npcs, type NpcId } from './game/npcs';
import {loadTimeMode,type TimeMode} from './game/systems/timeOfDay';
import {WorldMap} from './components/WorldMap';


export default function App() {
  const { t, i18n } = useTranslation();
  const [entered, setEntered] = useState(false);
  const [nearby, setNearby] = useState<AreaId>();
  const [area, setArea] = useState<AreaId>();
  const [sound, setSound] = useState(false);
  const [motion, setMotion] = useState(localStorage.getItem('cloud-tao-motion') !== 'reduced');
  const [secrets, setSecrets] = useState<string[]>(() => JSON.parse(localStorage.getItem('cloud-tao-secrets') || '[]'));
  const [toast, setToast] = useState(false);
  const [progress, setProgress] = useState<PracticeProgress>(() => loadProgress());
  const [profileOpen, setProfileOpen] = useState(false);
  const [identity, setIdentity] = useState<TaoIdentity|undefined>(()=>loadIdentity());
  const [namingOpen, setNamingOpen] = useState(false);
  const [nearbyNpc,setNearbyNpc]=useState<NpcId>();
  const [talkingNpc,setTalkingNpc]=useState<NpcId>();
  const [oracleCastKey,setOracleCastKey]=useState(0);
  const [timeMode,setTimeMode]=useState<TimeMode>(()=>loadTimeMode());
  const [trailDone,setTrailDone]=useState(false);
  useAmbience(sound);

  useEffect(() => {
    const offNearby = gameEvents.on('nearby', ({ id, active }) => setNearby(active ? id : undefined));
    const offEnter = gameEvents.on('enterArea', ({ id }) => setArea(id));
    const offOracleConsult = gameEvents.on('oracleConsult', ({ castKey }) => { setOracleCastKey(castKey); setArea('oracle'); });
    const offNpcNearby=gameEvents.on('npcNearby',({id,active})=>setNearbyNpc(active?id:undefined));
    const offTalk=gameEvents.on('talkNpc',({id})=>setTalkingNpc(id));
    const offSecret = gameEvents.on('secret', ({ id }) => {
      setSecrets(old => { const next = [...new Set([...old, id])]; localStorage.setItem('cloud-tao-secrets', JSON.stringify(next)); return next; });
      setToast(true); window.setTimeout(() => setToast(false), 4200);
    });
    const offTrail=gameEvents.on('immersiveTrailComplete',()=>{setTrailDone(true);window.setTimeout(()=>setTrailDone(false),4200)});
    const onProgress = (event: Event) => setProgress((event as CustomEvent<PracticeProgress>).detail);
    window.addEventListener('cloud-tao-progress', onProgress);
    return () => { offNearby(); offEnter(); offOracleConsult(); offNpcNearby(); offTalk(); offSecret(); offTrail(); window.removeEventListener('cloud-tao-progress', onProgress); };
  }, []);

  const toggleLang = async () => { const next=i18n.resolvedLanguage === 'zh' ? 'en' : 'zh';await i18n.changeLanguage(next);window.dispatchEvent(new CustomEvent('cloud-tao-language',{detail:next})); };
  const toggleMotion = () => { const next = !motion; setMotion(next); localStorage.setItem('cloud-tao-motion', next ? 'full' : 'reduced'); };
  const cycleTime=()=>{const modes:TimeMode[]=['auto','day','dusk','night'],next=modes[(modes.indexOf(timeMode)+1)%modes.length];setTimeMode(next);localStorage.setItem('cloud-tao-time-mode',next);window.dispatchEvent(new CustomEvent('cloud-tao-time',{detail:next}))};
  const closeArea = () => { if(area==='meditation')gameEvents.emit('meditationSeat',{active:false});setArea(undefined); };

  return <main className={motion ? '' : 'reduced-motion'}>
    {!entered && <section className="landing">
      <div className="mountain mountain--back"/><div className="mountain mountain--front"/>
      <div className="sun"/><div className="landing-cloud c1"/><div className="landing-cloud c2"/>
      <div className="title-seal">道</div>
      <p className="eyebrow">AN INTERACTIVE TAOIST SANCTUARY</p>
      <h1><span>Cloud Tao</span><b>云上道观</b></h1>
      <p className="subtitle">{t('subtitle')}</p>
      <button className="primary-button enter-button" onClick={() => {setEntered(true);if(!identity)setNamingOpen(true)}}>{t('enter')} <span>→</span></button>
      <button className="language-button" onClick={toggleLang}>{t('lang')}</button>
    </section>}
    {entered && <section className="world">
      <GameCanvas active={entered}/>
      <header className="hud-top"><div className="brand"><i>道</i><div><b>Cloud Tao</b><span>{t('mapLabel')}</span></div><WorldMap zh={i18n.resolvedLanguage==='zh'}/></div>
        <nav><button onClick={()=>setProfileOpen(true)}>☯ {identity?.name||''} · {progress.xp} XP</button><button onClick={() => setSound(!sound)}>{t(sound ? 'soundOn':'soundOff')}</button><button onClick={cycleTime}>{i18n.resolvedLanguage==='zh'?({auto:'时辰：自动',day:'时辰：白昼',dusk:'时辰：黄昏',night:'时辰：夜晚'} as const)[timeMode]:({auto:'Time: auto',day:'Time: day',dusk:'Time: dusk',night:'Time: night'} as const)[timeMode]}</button><button onClick={toggleMotion}>{t(motion?'motionOn':'motionOff')}</button><button onClick={toggleLang}>{t('lang')}</button></nav>
      </header>
      <div className="control-hint">⌨ {t('hint')}</div><div className="secret-count">✦ {t('discovered', { count: secrets.length })}</div><div className="xp-chip">{titleForXp(progress.xp, i18n.resolvedLanguage === 'zh')} · {progress.xp} XP</div><Joystick/>{nearbyNpc?<button className="interaction-prompt" onClick={()=>setTalkingNpc(nearbyNpc)}>E · {i18n.resolvedLanguage==='zh'?'与':'Talk to '}{i18n.resolvedLanguage==='zh'?npcs.find(n=>n.id===nearbyNpc)?.nameZh:npcs.find(n=>n.id===nearbyNpc)?.nameEn}{i18n.resolvedLanguage==='zh'?'交谈':''}</button>:nearby&&<button className="interaction-prompt" onClick={() => gameEvents.emit('activateArea',{id:nearby})}>{interactionText(t('interact'), t(`${nearby}.name`))}</button>}
      {toast && <aside className="wisdom-toast"><b>{t('hiddenTitle')}</b><p>“{t('hiddenText')}”</p></aside>}
      {trailDone&&<aside className="wisdom-toast"><b>{i18n.resolvedLanguage==='zh'?'太极场已抵达':'Taiji Court reached'}</b><p>{i18n.resolvedLanguage==='zh'?'从山门入境，过桥而行，心境渐静。':'Through the gate and over the bridge, the mind grows still.'}</p></aside>}
      {area&&<AreaPanel id={area} identityName={identity?.name} oracleCastKey={oracleCastKey} onClose={closeArea}/>} 
      {profileOpen && <ProfilePanel identityName={identity?.name} progress={progress} secrets={secrets.length} onRename={()=>{setProfileOpen(false);setNamingOpen(true)}} onClose={()=>setProfileOpen(false)} onClear={()=>{localStorage.clear();location.reload()}}/>}
      {namingOpen&&<IdentityPanel onDone={value=>{setIdentity(value);setNamingOpen(false)}} onCancel={identity?()=>setNamingOpen(false):undefined}/>} 
      {talkingNpc&&<NpcDialogue id={talkingNpc} identityName={identity?.name} onClose={()=>setTalkingNpc(undefined)}/>} 
    </section>}
  </main>;
}
