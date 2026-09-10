import type { SepSolution, StructureType } from '@sep/core';

export interface ResultsFilter {
  fepIds: readonly string[];
  structures: readonly StructureType[];
  materialIds: readonly (string | null)[];
  concentrations: readonly number[];
  paretoOnly: boolean;
  powerMin: number | undefined;
  powerMax: number | undefined;
  massMin: number | undefined;
  massMax: number | undefined;
  areaMin: number | undefined;
  areaMax: number | undefined;
}

export function emptyResultsFilter(): ResultsFilter {
  return {
    fepIds: [],
    structures: [],
    materialIds: [],
    concentrations: [],
    paretoOnly: false,
    powerMin: undefined,
    powerMax: undefined,
    massMin: undefined,
    massMax: undefined,
    areaMin: undefined,
    areaMax: undefined,
  };
}

function matchesOptionalList<T>(value: T, selected: readonly T[]): boolean {
  return selected.length === 0 || selected.includes(value);
}

function matchesRange(
  value: number,
  min: number | undefined,
  max: number | undefined,
): boolean {
  if (min !== undefined && value < min) {
    return false;
  }
  if (max !== undefined && value > max) {
    return false;
  }
  return true;
}

/**
 * Filters already calculated solutions. Does not mutate `solutions`
 * and must not trigger `calculateSep`.
 */
export function filterSolutions(
  solutions: readonly SepSolution[],
  filter: ResultsFilter,
): SepSolution[] {
  return solutions.filter((solution) => {
    if (!matchesOptionalList(solution.photovoltaicCellId, filter.fepIds)) {
      return false;
    }
    if (!matchesOptionalList(solution.structureType, filter.structures)) {
      return false;
    }
    if (!matchesOptionalList(solution.concentratorMaterialId, filter.materialIds)) {
      return false;
    }
    if (!matchesOptionalList(solution.concentration, filter.concentrations)) {
      return false;
    }
    if (filter.paretoOnly && !solution.isPareto) {
      return false;
    }
    if (!matchesRange(solution.averagePowerW, filter.powerMin, filter.powerMax)) {
      return false;
    }
    if (!matchesRange(solution.totalMassKg, filter.massMin, filter.massMax)) {
      return false;
    }
    if (!matchesRange(solution.sepAreaM2, filter.areaMin, filter.areaMax)) {
      return false;
    }
    return true;
  });
}
