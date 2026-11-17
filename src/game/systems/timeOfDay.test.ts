import {describe,expect,it} from 'vitest';
import {resolveTimePhase} from './timeOfDay';

describe('time of day',()=>{
  it.each([[6,'dawn'],[10,'day'],[18,'dusk'],[23,'night'],[3,'night']] as const)('maps hour %s to %s',(hour,phase)=>expect(resolveTimePhase('auto',hour)).toBe(phase));
  it('honors a manual mode',()=>expect(resolveTimePhase('night',12)).toBe('night'));
});
