import { describe, expect, it } from 'vitest';
import { DEFAULT_SORT, sortSolutions, toggleSort } from './sort.ts';
import { testSolution } from './test-solution.ts';

const SOLUTIONS = [
  testSolution({ id: 'heavy', totalMassKg: 2, concentration: 3, powerToMassWPerKg: 10 }),
  testSolution({ id: 'light', totalMassKg: 0.4, concentration: 1, powerToMassWPerKg: 80 }),
  testSolution({ id: 'mid', totalMassKg: 1, concentration: 2, powerToMassWPerKg: 40 }),
];

const MIXED = [
  testSolution({ id: 'n-heavy', isPareto: false, totalMassKg: 9, concentration: 4 }),
  testSolution({ id: 'p-heavy', isPareto: true, totalMassKg: 8, concentration: 3 }),
  testSolution({ id: 'n-light', isPareto: false, totalMassKg: 1, concentration: 1 }),
  testSolution({ id: 'p-light', isPareto: true, totalMassKg: 2, concentration: 2 }),
];

describe('sortSolutions', () => {
  it('keeps Pareto solutions first when no column is selected', () => {
    const original = MIXED.map((solution) => solution.id);
    const sorted = sortSolutions(MIXED, DEFAULT_SORT);

    expect(sorted.map((solution) => solution.id)).toEqual([
      'p-heavy',
      'p-light',
      'n-heavy',
      'n-light',
    ]);
    expect(MIXED.map((solution) => solution.id)).toEqual(original);
    expect(MIXED.map((solution) => solution.isPareto)).toEqual([
      false,
      true,
      false,
      true,
    ]);
    expect(sorted).not.toBe(MIXED);
    expect(sorted[0]).toBe(MIXED[1]);
  });

  it('applies numeric ascending inside Pareto and non-Pareto groups', () => {
    expect(
      sortSolutions(MIXED, { key: 'totalMassKg', direction: 'asc' }).map(
        (solution) => solution.id,
      ),
    ).toEqual(['p-light', 'p-heavy', 'n-light', 'n-heavy']);
  });

  it('applies numeric descending inside Pareto and non-Pareto groups', () => {
    expect(
      sortSolutions(MIXED, { key: 'totalMassKg', direction: 'desc' }).map(
        (solution) => solution.id,
      ),
    ).toEqual(['p-heavy', 'p-light', 'n-heavy', 'n-light']);
  });

  it('keeps several Pareto solutions ahead of several non-Pareto ones', () => {
    const many = [
      testSolution({ id: 'n1', isPareto: false, powerToMassWPerKg: 90 }),
      testSolution({ id: 'p1', isPareto: true, powerToMassWPerKg: 10 }),
      testSolution({ id: 'n2', isPareto: false, powerToMassWPerKg: 80 }),
      testSolution({ id: 'p2', isPareto: true, powerToMassWPerKg: 20 }),
    ];

    expect(
      sortSolutions(many, { key: 'powerToMassWPerKg', direction: 'desc' }).map(
        (solution) => solution.id,
      ),
    ).toEqual(['p2', 'p1', 'n1', 'n2']);
  });

  it('falls back to the selected numeric order when no solution is Pareto', () => {
    expect(
      sortSolutions(SOLUTIONS, { key: 'totalMassKg', direction: 'asc' }).map(
        (solution) => solution.id,
      ),
    ).toEqual(['light', 'mid', 'heavy']);
  });

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
