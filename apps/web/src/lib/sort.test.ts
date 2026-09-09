import { describe, expect, it } from 'vitest';
import { DEFAULT_SORT, sortSolutions, toggleSort } from './sort.ts';
import { testSolution } from './test-solution.ts';

const SOLUTIONS = [
  testSolution({ id: 'heavy', totalMassKg: 2, concentration: 3, powerToMassWPerKg: 10 }),
  testSolution({ id: 'light', totalMassKg: 0.4, concentration: 1, powerToMassWPerKg: 80 }),
  testSolution({ id: 'mid', totalMassKg: 1, concentration: 2, powerToMassWPerKg: 40 }),
];

describe('sortSolutions', () => {
  it('returns a new array and keeps the original order intact', () => {
    const original = [...SOLUTIONS];
    const sorted = sortSolutions(SOLUTIONS, {
      key: 'totalMassKg',
      direction: 'asc',
    });

    expect(sorted.map((solution) => solution.id)).toEqual(['light', 'mid', 'heavy']);
    expect(SOLUTIONS.map((solution) => solution.id)).toEqual(['heavy', 'light', 'mid']);
    expect(SOLUTIONS).toEqual(original);
    expect(sorted).not.toBe(SOLUTIONS);
  });

  it('sorts numeric keys ascending and descending', () => {
    expect(
      sortSolutions(SOLUTIONS, { key: 'concentration', direction: 'desc' }).map(
        (solution) => solution.id,
      ),
    ).toEqual(['heavy', 'mid', 'light']);

    expect(
      sortSolutions(SOLUTIONS, { key: 'powerToMassWPerKg', direction: 'asc' }).map(
        (solution) => solution.id,
      ),
    ).toEqual(['heavy', 'mid', 'light']);
  });

  it('copies the array when no sort key is selected', () => {
    const sorted = sortSolutions(SOLUTIONS, DEFAULT_SORT);
    expect(sorted).toEqual(SOLUTIONS);
    expect(sorted).not.toBe(SOLUTIONS);
  });
});

describe('toggleSort', () => {
  it('cycles unused key → asc → desc → none', () => {
    const first = toggleSort(DEFAULT_SORT, 'sepAreaM2');
    expect(first).toEqual({ key: 'sepAreaM2', direction: 'asc' });

    const second = toggleSort(first, 'sepAreaM2');
    expect(second).toEqual({ key: 'sepAreaM2', direction: 'desc' });

    const third = toggleSort(second, 'sepAreaM2');
    expect(third).toEqual({ key: null, direction: 'asc' });
  });
});
