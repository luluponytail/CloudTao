import{beforeEach,describe,expect,it}from'vitest';import{completeDaily,loadDaily}from'./daily';
describe('daily practice',()=>{beforeEach(()=>localStorage.clear());it('stores each completion once',()=>{completeDaily('breathe');completeDaily('breathe');expect(loadDaily()).toEqual(['breathe'])})});
