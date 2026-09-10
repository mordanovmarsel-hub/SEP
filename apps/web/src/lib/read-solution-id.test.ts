import { describe, expect, it } from 'vitest';
import { readSolutionId } from './read-solution-id.ts';

describe('readSolutionId', () => {
  it('accepts a non-empty string', () => {
    expect(readSolutionId('sol-1')).toBe('sol-1');
  });

  it('accepts the first element of an array', () => {
    expect(readSolutionId(['sol-2', 'ignored'])).toBe('sol-2');
  });

  it('rejects empty values', () => {
    expect(readSolutionId('')).toBeNull();
    expect(readSolutionId([])).toBeNull();
    expect(readSolutionId([1])).toBeNull();
    expect(readSolutionId(null)).toBeNull();
    expect(readSolutionId(undefined)).toBeNull();
  });
});
