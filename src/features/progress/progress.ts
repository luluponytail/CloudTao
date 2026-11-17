export interface PracticeProgress {
  xp: number;
  oracleCount: number;
  meditationMinutes: number;
  taichiMinutes: number;
  wishes: Array<{ text: string; theme: string; date: string }>;
  lastPracticeDate?: string;
}

export const defaultProgress: PracticeProgress = { xp: 0, oracleCount: 0, meditationMinutes: 0, taichiMinutes: 0, wishes: [] };
const key = 'cloud-tao-progress-v1';

export function loadProgress(): PracticeProgress {
  try { return { ...defaultProgress, ...JSON.parse(localStorage.getItem(key) || '{}') }; }
  catch { return { ...defaultProgress }; }
}

export function saveProgress(progress: PracticeProgress) {
  localStorage.setItem(key, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent('cloud-tao-progress', { detail: progress }));
}

export function addPractice(patch: Partial<Pick<PracticeProgress, 'oracleCount'|'meditationMinutes'|'taichiMinutes'>>, xp: number) {
  const current = loadProgress();
  const next = { ...current, xp: current.xp + xp, lastPracticeDate: new Date().toISOString().slice(0, 10) };
  for (const field of ['oracleCount','meditationMinutes','taichiMinutes'] as const) next[field] += patch[field] || 0;
  saveProgress(next); return next;
}

export function titleForXp(xp: number, zh: boolean) {
  if (xp >= 1000) return zh ? '太极宗师' : 'Tai Chi Master';
  if (xp >= 500) return zh ? '太极达人' : 'Tai Chi Adept';
  if (xp >= 150) return zh ? '太极修习者' : 'Tai Chi Practitioner';
  return zh ? '初入道门' : 'New Seeker';
}
