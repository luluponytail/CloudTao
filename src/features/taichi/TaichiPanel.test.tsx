import {act,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import '../../locales/i18n';
import {loadProgress} from '../progress/progress';
import {TaichiPanel} from './TaichiPanel';

describe('Tai Chi completion',()=>{
 beforeEach(()=>{localStorage.clear();vi.useFakeTimers()});
 afterEach(()=>vi.useRealTimers());
 it('finishes without a nested React update and grants the reward once',async()=>{
  render(<TaichiPanel/>);
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'1'}});
  fireEvent.click(screen.getByRole('button',{name:/开始跟练|Follow/}));
  for(let step=0;step<18;step++)await act(async()=>{vi.advanceTimersByTime(1800)});
  expect(screen.getByText(/获得 30 经验|30 XP earned/)).toBeInTheDocument();
  expect(loadProgress()).toMatchObject({xp:30,taichiMinutes:3});
 });
});
