import type { SepSolution } from '@sep/core';

export const SORT_KEYS = [
  'concentration',
  'sepAreaM2',
  'fepAreaM2',
  'averagePowerW',
  'totalMassKg',
  'powerToMassWPerKg',
  'powerMarginW',
  'massMarginKg',
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: SortKey | null;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortState = {
  key: null,
  direction: 'asc',
};

export function toggleSort(current: SortState, key: SortKey): SortState {
  if (current.key !== key) {
    return { key, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { key, direction: 'desc' };
  }
  return { key: null, direction: 'asc' };
}

/**
 * Presentation order only: Pareto first, then the user sort inside each group.
 * Never mutates `solutions` and does not change `isPareto` flags.
 */
export function sortSolutions(
  solutions: readonly SepSolution[],
  sort: SortState,
): SepSolution[] {
  const copy = [...solutions];
  const key = sort.key;
  const sign = sort.direction === 'asc' ? 1 : -1;

  copy.sort((left, right) => {
    if (left.isPareto !== right.isPareto) {
      return left.isPareto ? -1 : 1;
    }

    if (key === null) {
      return 0;
    }

    const delta = left[key] - right[key];
    if (delta < 0) {
      return -sign;
    }
    if (delta > 0) {
      return sign;
    }
    return 0;
  });

  return copy;
}
