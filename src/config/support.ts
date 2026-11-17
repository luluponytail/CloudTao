export const supportConfig = {
  paypalUrl: 'https://paypal.me/lululuyang',
  amazonBookUrl: 'https://www.amazon.com/Ching-Book-Answers-Sixty-Four-Oracle/dp/B0HQJLMZKN',
  currency: 'USD',
} as const;

export function isSafeExternalUrl(value:string){
  try{return new URL(value).protocol==='https:'}catch{return false}
}

export function paypalAmountUrl(amount:number){
  if(!isSafeExternalUrl(supportConfig.paypalUrl))return '';
  const safeAmount=Math.max(1,Math.round(amount));
  return `${supportConfig.paypalUrl.replace(/\/$/,'')}/${safeAmount}USD`;
}
