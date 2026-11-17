import { useTranslation } from 'react-i18next';
import type { AreaId } from '../game/worldData';
import { OraclePanel } from '../features/oracle/OraclePanel';
import { MeditationPanel } from '../features/meditation/MeditationPanel';
import { TaichiPanel } from '../features/taichi/TaichiPanel';
import { LibraryPanel } from '../features/library/LibraryPanel';
import { WishPanel } from '../features/wishes/WishPanel';
import { PracticePanel } from '../features/practice/PracticePanel';
import { SanqingPanel } from '../features/sanqing/SanqingPanel';
import { WealthPanel } from '../features/wealth/WealthPanel';

export function AreaPanel({ id, identityName, oracleCastKey, onClose }: { id: AreaId; identityName?:string; oracleCastKey?:number; onClose: () => void }) {
  const { t,i18n } = useTranslation();
  const feature = id === 'oracle' ? <OraclePanel autoDrawKey={oracleCastKey}/> : id === 'meditation' ? <MeditationPanel/> : id === 'taichi' ? <TaichiPanel/> : id === 'library' ? <LibraryPanel/> : id === 'wish' ? <WishPanel/> : id === 'garden' ? <PracticePanel/> : id === 'sanqing' ? <SanqingPanel/> : id === 'wealth' ? <WealthPanel/> : undefined;
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="area-panel" role="dialog" aria-modal="true" aria-labelledby="area-title">
      <div className={`area-art area-art--${id}`}><span>☯</span></div>
      <p className="eyebrow">CLOUD TAO · 云上道观</p>
      <h2 id="area-title">{t(`${id}.name`)}</h2>
      <p className="area-desc">{t(`${id}.desc`)}</p>
      {identityName&&<p className="personal-greeting">{i18n.resolvedLanguage==='zh'?`${identityName}道友，欢迎来到此处。`:`Welcome, ${identityName}.`}</p>}
      <div className="ink-rule" />
      {feature || <p>{t('coming')}</p>}
      <button className="primary-button" onClick={onClose}>{t('close')}</button>
    </section>
  </div>;
}
