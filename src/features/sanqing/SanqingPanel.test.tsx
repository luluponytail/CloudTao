import {fireEvent,render,screen} from '@testing-library/react';
import {beforeEach,describe,expect,it} from 'vitest';
import '../../locales/i18n';
import {loadProgress} from '../progress/progress';
import {SanqingPanel} from './SanqingPanel';

describe('Sanqing hall interaction',()=>{
 beforeEach(()=>localStorage.clear());
 it('unlocks reflection after observing all three and awards a single daily reward',()=>{
  render(<SanqingPanel/>);
  const deityButtons=screen.getAllByRole('button').slice(0,3);
  deityButtons.forEach(button=>fireEvent.click(button));
  fireEvent.click(screen.getByRole('link',{name:/上香并支持云上道观|Offer incense & support/}));
  fireEvent.click(screen.getByRole('button',{name:/我现在真正想开始|What do I truly wish/}));
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'今日从一件小事开始。'}});
  fireEvent.click(screen.getByRole('button',{name:/收存今日省思|Keep today/}));
  expect(screen.getByText(/三清殿印记|Sanqing Hall Seal/)).toBeInTheDocument();
  expect(loadProgress().xp).toBe(30);
 });
});
