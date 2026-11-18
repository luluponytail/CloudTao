export const supportConfig = {
  amazonBookUrl: 'https://www.amazon.com/Ching-Book-Answers-Sixty-Four-Oracle/dp/B0HQJLMZKN',
} as const;

export function isSafeExternalUrl(value:string){
  try{return new URL(value).protocol==='https:'}catch{return false}
}
