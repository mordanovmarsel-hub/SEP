import { describe, expect, it } from 'vitest';
import { readSolutionId } from './read-solution-id.ts';

describe('readSolutionId', () => {
  it('accepts a non-empty string', () => {
    expect(readSolutionId('sol-1')).toBe('sol-1');
  });

  it('accepts a single-element string wrapper', () => {
    expect(readSolutionId(['sol-2'])).toBe('sol-2');
  });

  it('reconstructs a parsed JSON solution-id tuple', () => {
    const tuple = ['fixture-fep', 'honeycomb', null, 1200, 1, 1] as const;
    expect(readSolutionId([...tuple])).toBe(JSON.stringify([...tuple]));
  });

  it('rejects empty values and non-tuple arrays', () => {
    expect(readSolutionId('')).toBeNull();
    expect(readSolutionId([])).toBeNull();
    expect(readSolutionId([1])).toBeNull();
    expect(readSolutionId(['sol-2', 'ignored'])).toBeNull();
    expect(readSolutionId(null)).toBeNull();
    expect(readSolutionId(undefined)).toBeNull();
  });
});
