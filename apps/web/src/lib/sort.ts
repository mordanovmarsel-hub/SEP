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
 * Returns a new sorted array. Never mutates the original `solutions`.
 */
export function sortSolutions(
  solutions: readonly SepSolution[],
  sort: SortState,
): SepSolution[] {
  const copy = [...solutions];

  if (sort.key === null) {
    return copy;
  }

  const key = sort.key;
  const sign = sort.direction === 'asc' ? 1 : -1;

  copy.sort((left, right) => {
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
