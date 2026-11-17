import{beforeEach,describe,expect,it}from'vitest';import{generateTaoName,loadIdentity,saveIdentity}from'./identity';
describe('tao identity',()=>{beforeEach(()=>localStorage.clear());it('generates deterministic names',()=>expect(generateTaoName(()=>0)).toBe('清和'));it('trims and persists a name',()=>{saveIdentity('  清和  ');expect(loadIdentity()?.name).toBe('清和')})});
