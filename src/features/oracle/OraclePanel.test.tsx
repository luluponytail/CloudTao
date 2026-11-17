import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../locales/i18n';
import { OraclePanel } from './OraclePanel';

describe('Oracle result reveal', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('zh');
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('waits for a question before revealing a result in React strict mode', async () => {
    render(<StrictMode><OraclePanel autoDrawKey={12345} /></StrictMode>);
    const submit=screen.getByRole('button',{name:/请道长解签|Ask the master/});
    expect(submit).toBeDisabled();
    expect(screen.queryByRole('heading',{name:/1\. 乾/})).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/请输入想占问的问题/),{target:{value:'我的工作应该如何推进？'}});
    fireEvent.click(submit);
    await act(async () => vi.advanceTimersByTime(450));
    expect(screen.getByRole('heading', { name: /1\. 乾|1\. The Creative/ })).toBeInTheDocument();
    expect(screen.getByText('主动开创，并以持续行动让最初的力量真正落地。')).toBeInTheDocument();
  });

  it('shows a Chinese divination message without leaking English book guidance', async () => {
    render(<OraclePanel autoDrawKey={99} />);
    fireEvent.change(screen.getByPlaceholderText(/请输入想占问的问题/),{target:{value:'这件事会如何发展？'}});
    fireEvent.click(screen.getByRole('button',{name:/请道长解签/}));
    await act(async () => vi.advanceTimersByTime(450));
    expect(screen.getByText(/卦象判断/)).toBeInTheDocument();
    expect(screen.queryByText('A strong beginning. Its promise depends on follow-through.')).not.toBeInTheDocument();
  });
});
