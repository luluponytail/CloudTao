import {describe,expect,it} from 'vitest';
import {movementAbilities,unlockedMovementAbilities} from './movementAbilities';
describe('movement ability progression',()=>{
  it('starts with normal walking only',()=>expect(unlockedMovementAbilities(0,0).map(item=>item.id)).toEqual(['walk']));
  it('unlocks fictional abilities only after their requirements',()=>{expect(unlockedMovementAbilities(10,0).map(item=>item.id)).toContain('qinggong');expect(unlockedMovementAbilities(0,3).map(item=>item.id)).toContain('cloudRiding');expect(movementAbilities.filter(item=>item.id!=='walk').every(item=>item.fictional)).toBe(true)});
});
