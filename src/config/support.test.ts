import {describe,expect,it} from 'vitest';
import {isSafeExternalUrl,paypalAmountUrl,supportConfig} from './support';

describe('support configuration',()=>{
  it('uses the permanent Amazon product page without search tracking',()=>{
    expect(supportConfig.amazonBookUrl).toBe('https://www.amazon.com/Ching-Book-Answers-Sixty-Four-Oracle/dp/B0HQJLMZKN');
    expect(supportConfig.amazonBookUrl).not.toContain('ref=');
  });
  it('allows HTTPS only',()=>{expect(isSafeExternalUrl(supportConfig.amazonBookUrl)).toBe(true);expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);expect(isSafeExternalUrl('')).toBe(false)});
  it('uses the configured PayPal.Me account and passes the selected USD amount',()=>{
    expect(supportConfig.paypalUrl).toBe('https://paypal.me/lululuyang');
    expect(paypalAmountUrl(5)).toBe('https://paypal.me/lululuyang/5USD');
  });
});
