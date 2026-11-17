export interface TaoIdentity { name:string; createdAt:string }
export const IDENTITY_KEY='cloud-tao-identity-v1';
const first=['清','守','观','听','栖','知','怀','静','云','松'];
const second=['和','一','澜','松','云','白','虚','心','隐','风'];
export function generateTaoName(random=Math.random){const a=first[Math.floor(random()*first.length)],b=second[Math.floor(random()*second.length)];return a===b?`${a}玄`:`${a}${b}`}
export function loadIdentity():TaoIdentity|undefined{try{const value=localStorage.getItem(IDENTITY_KEY);return value?JSON.parse(value):undefined}catch{return undefined}}
export function saveIdentity(name:string){const identity={name:name.trim().slice(0,18)||'云游客',createdAt:new Date().toISOString()};localStorage.setItem(IDENTITY_KEY,JSON.stringify(identity));window.dispatchEvent(new CustomEvent('cloud-tao-identity',{detail:identity}));return identity}
