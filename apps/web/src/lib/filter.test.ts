import { describe, expect, it } from 'vitest';
import { emptyResultsFilter, filterSolutions } from './filter.ts';
import { testSolution } from './test-solution.ts';

const SOLUTIONS = [
  testSolution({
    id: 'a',
    photovoltaicCellId: 'fep-1',
    structureType: 'honeycomb',
    concentratorMaterialId: null,
    concentratorMaterialName: null,
    concentration: 1,
    averagePowerW: 20,
    totalMassKg: 0.2,
    sepAreaM2: 0.1,
    isPareto: true,
  }),
  testSolution({
    id: 'b',
    photovoltaicCellId: 'fep-2',
    photovoltaicCellName: 'ФЭП 2',
    structureType: 'frame',
    concentratorMaterialId: 'bk7',
    concentratorMaterialName: 'BK7',
    concentration: 4,
    averagePowerW: 80,
    totalMassKg: 1.2,
    sepAreaM2: 0.4,
    isPareto: false,
  }),
];

describe('filterSolutions', () => {
  it('does not mutate the original solutions array', () => {
    const original = [...SOLUTIONS];
    const filtered = filterSolutions(SOLUTIONS, {
      ...emptyResultsFilter(),
      paretoOnly: true,
    });

    expect(filtered.map((solution) => solution.id)).toEqual(['a']);
    expect(SOLUTIONS).toEqual(original);
    expect(filtered).not.toBe(SOLUTIONS);
  });

  it('filters by FEP, structure, material, K and Pareto', () => {
    expect(
      filterSolutions(SOLUTIONS, {
        ...emptyResultsFilter(),
        fepIds: ['fep-2'],
      }).map((solution) => solution.id),
    ).toEqual(['b']);

    expect(
      filterSolutions(SOLUTIONS, {
        ...emptyResultsFilter(),
        structures: ['honeycomb'],
      }).map((solution) => solution.id),
    ).toEqual(['a']);

    expect(
      filterSolutions(SOLUTIONS, {
        ...emptyResultsFilter(),
        materialIds: [null],
      }).map((solution) => solution.id),
    ).toEqual(['a']);

    expect(
      filterSolutions(SOLUTIONS, {
        ...emptyResultsFilter(),
        concentrations: [4],
      }).map((solution) => solution.id),
    ).toEqual(['b']);
  });

  it('applies numeric ranges for power, mass and area', () => {
    expect(
      filterSolutions(SOLUTIONS, {
        ...emptyResultsFilter(),
        powerMin: 50,
      }).map((solution) => solution.id),
    ).toEqual(['b']);

    expect(
      filterSolutions(SOLUTIONS, {
        ...emptyResultsFilter(),
        massMax: 0.5,
      }).map((solution) => solution.id),
    ).toEqual(['a']);

    expect(
      filterSolutions(SOLUTIONS, {
        ...emptyResultsFilter(),
        areaMin: 0.2,
        areaMax: 0.4,
      }).map((solution) => solution.id),
    ).toEqual(['b']);
  });

  it('treats empty categorical lists as "all"', () => {
    expect(filterSolutions(SOLUTIONS, emptyResultsFilter())).toEqual(SOLUTIONS);
  });
});
