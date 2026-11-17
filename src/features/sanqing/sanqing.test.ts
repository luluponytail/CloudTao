import {beforeEach,describe,expect,it,vi} from 'vitest';
import {completeSanqing,loadSanqingState,localDateKey} from './sanqing';

describe('sanqing practice',()=>{
 beforeEach(()=>localStorage.clear());
 it('uses a local calendar date key',()=>expect(localDateKey(new Date(2026,10,14,23,30))).toBe('2026-11-14'));
 it('awards daily xp once and unlocks both seals for the traditional order',()=>{
  vi.setSystemTime(new Date(2026,10,14,12));
  const record={date:'2026-11-14',observed:['yuanshi','lingbao','daode'] as const,incenseOffered:true,reflectionQuestion:'q',reflectionText:'r',completed:true};
  expect(completeSanqing({...record,observed:[...record.observed]},true).xpAwarded).toBe(30);
  expect(completeSanqing({...record,observed:[...record.observed]},true).xpAwarded).toBe(0);
  expect(loadSanqingState().seals.map(item=>item.id)).toEqual(['sanqing-visit','sanqing-order']);
 });
});
