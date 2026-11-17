import { loadProgress, saveProgress } from '../progress/progress';

export type DeityId = 'yuanshi' | 'lingbao' | 'daode';

export interface TempleSeal {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  source: string;
  earnedAt: string;
  hidden: boolean;
}

export interface SanqingRecord {
  date: string;
  observed: DeityId[];
  incenseOffered: boolean;
  reflectionQuestion?: string;
  reflectionText?: string;
  completed: boolean;
}

export interface SanqingState {
  version: 1;
  records: Record<string, SanqingRecord>;
  seals: TempleSeal[];
}

const STORAGE_KEY = 'cloud-tao-sanqing-v1';
const DAILY_XP = 30;

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadSanqingState(): SanqingState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<SanqingState>;
    return { version: 1, records: stored.records || {}, seals: stored.seals || [] };
  } catch {
    return { version: 1, records: {}, seals: [] };
  }
}

export function saveSanqingState(state: SanqingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('cloud-tao-sanqing', { detail: state }));
}

export function createSeal(id: 'sanqing-visit' | 'sanqing-order', date: string): TempleSeal {
  if (id === 'sanqing-order') return {
    id, nameZh: '三清道印', nameEn: 'Seal of the Three Pure Ones',
    descriptionZh: '依元始、灵宝、道德之序观礼三清。',
    descriptionEn: 'Observed the Three Pure Ones in the traditional sequence.',
    source: 'sanqing', earnedAt: date, hidden: true,
  };
  return {
    id, nameZh: '三清殿印记', nameEn: 'Sanqing Hall Seal',
    descriptionZh: '完成观三清与今日省思。',
    descriptionEn: 'Completed the Sanqing contemplation and daily reflection.',
    source: 'sanqing', earnedAt: date, hidden: false,
  };
}

export function completeSanqing(record: SanqingRecord, correctOrder: boolean) {
  const state = loadSanqingState();
  const previous = state.records[record.date];
  const firstCompletion = !previous?.completed;
  state.records[record.date] = { ...record, completed: true };
  const addSeal = (seal: TempleSeal) => {
    if (!state.seals.some(item => item.id === seal.id)) state.seals.push(seal);
  };
  addSeal(createSeal('sanqing-visit', record.date));
  if (correctOrder) addSeal(createSeal('sanqing-order', record.date));
  saveSanqingState(state);
  if (firstCompletion) {
    const progress = loadProgress();
    saveProgress({ ...progress, xp: progress.xp + DAILY_XP, lastPracticeDate: record.date });
  }
  return { state, xpAwarded: firstCompletion ? DAILY_XP : 0 };
}

export function todayRecord(state = loadSanqingState(), date = localDateKey()): SanqingRecord {
  return state.records[date] || { date, observed: [], incenseOffered: false, completed: false };
}
