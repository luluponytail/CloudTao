export type TimeMode='auto'|'day'|'dusk'|'night';
export type TimePhase='dawn'|'day'|'dusk'|'night';

export function loadTimeMode():TimeMode{
  const value=localStorage.getItem('cloud-tao-time-mode');
  return value==='day'||value==='dusk'||value==='night'?value:'auto';
}

export function resolveTimePhase(mode:TimeMode,hour=new Date().getHours()):TimePhase{
  if(mode!=='auto')return mode;
  if(hour>=5&&hour<8)return'dawn';
  if(hour>=8&&hour<17)return'day';
  if(hour>=17&&hour<19)return'dusk';
  return'night';
}

export const timeVisuals:Record<TimePhase,{color:number;alpha:number;lampAlpha:number}>={
  dawn:{color:0xe8c991,alpha:.09,lampAlpha:.22},
  day:{color:0xffffff,alpha:0,lampAlpha:.08},
  dusk:{color:0xb66c4b,alpha:.16,lampAlpha:.42},
  night:{color:0x142b3c,alpha:.38,lampAlpha:.72},
};
