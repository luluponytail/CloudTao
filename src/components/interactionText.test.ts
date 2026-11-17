import { describe, expect, it } from 'vitest';
import { interactionText } from './interactionText';

describe('interactionText', () => {
  it('keeps a natural English instruction', () => {
    expect(interactionText('Press E to enter {{name}}', 'Wisdom Library')).toBe('Press E to enter Wisdom Library');
  });
  it('supports Chinese without special parsing', () => {
    expect(interactionText('按 E 进入 {{name}}', '藏经阁')).toBe('按 E 进入 藏经阁');
  });
});
