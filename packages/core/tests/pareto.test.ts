import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PARETO_CRITERIA,
  ParetoError,
  markParetoSolutions,
} from '../src/index';
import type { ParetoMetric, SepSolution } from '../src/index';

function solution(
  id: string,
  metrics: {
    totalMassKg: number;
    fepAreaM2: number;
    powerToMassWPerKg: number;
  },
  isPareto = false,
): SepSolution {
  return {
    id,
    photovoltaicCellId: 'fep',
    photovoltaicCellName: 'FEP',
    fepEfficiency: 0.3,
    structureType: 'frame',
    concentratorMaterialId: null,
    concentratorMaterialName: null,
    altitudeKm: 1200,
    concentration: 1,
    averageCosine: 0.7,
    sepAreaM2: metrics.fepAreaM2,
    fepAreaM2: metrics.fepAreaM2,
    averagePowerW: metrics.powerToMassWPerKg * metrics.totalMassKg,
    structureMassKg: metrics.totalMassKg,
    concentratorMassKg: 0,
    totalMassKg: metrics.totalMassKg,
    specificMassKgPerM2: metrics.totalMassKg / metrics.fepAreaM2,
    powerToMassWPerKg: metrics.powerToMassWPerKg,
    powerMarginW: 0,
    massMarginKg: 0,
    areaMarginM2: 0,
    isPareto,
  };
}

function flags(solutions: readonly SepSolution[]): Record<string, boolean> {
  return Object.fromEntries(solutions.map((item) => [item.id, item.isPareto]));
}

function ids(solutions: readonly SepSolution[]): string[] {
  return solutions.map((item) => item.id);
}

describe('markParetoSolutions', () => {
  it('marks a single solution as Pareto', () => {
    const only = solution('only', {
      totalMassKg: 10,
      fepAreaM2: 2,
      powerToMassWPerKg: 50,
    });

    const marked = markParetoSolutions([only]);

    expect(marked).toHaveLength(1);
    expect(marked[0]?.isPareto).toBe(true);
    expect(marked[0]?.id).toBe('only');
  });

  it('rejects a clearly dominated solution', () => {
    const better = solution('better', {
      totalMassKg: 1,
      fepAreaM2: 1,
      powerToMassWPerKg: 10,
    });
    const worse = solution('worse', {
      totalMassKg: 2,
      fepAreaM2: 2,
      powerToMassWPerKg: 5,
    });

    expect(flags(markParetoSolutions([better, worse]))).toEqual({
      better: true,
      worse: false,
    });
  });

  it('keeps a trade-off pair on the front', () => {
    const lightHeavyArea = solution('light', {
      totalMassKg: 1,
      fepAreaM2: 10,
      powerToMassWPerKg: 4,
    });
    const heavySmallArea = solution('small-area', {
      totalMassKg: 10,
      fepAreaM2: 1,
      powerToMassWPerKg: 4,
    });

    expect(flags(markParetoSolutions([lightHeavyArea, heavySmallArea]))).toEqual({
      light: true,
      'small-area': true,
    });
  });

  it('treats metric ties as mutually non-dominated', () => {
    const first = solution('first', {
      totalMassKg: 3,
      fepAreaM2: 2,
      powerToMassWPerKg: 8,
    });
    const second = solution('second', {
      totalMassKg: 3,
      fepAreaM2: 2,
      powerToMassWPerKg: 8,
    });

    expect(flags(markParetoSolutions([first, second]))).toEqual({
      first: true,
      second: true,
    });
  });

  it('does not let a tied pair dominate when a third solution is worse', () => {
    const first = solution('first', {
      totalMassKg: 3,
      fepAreaM2: 2,
      powerToMassWPerKg: 8,
    });
    const second = solution('second', {
      totalMassKg: 3,
      fepAreaM2: 2,
      powerToMassWPerKg: 8,
    });
    const dominated = solution('dominated', {
      totalMassKg: 4,
      fepAreaM2: 3,
      powerToMassWPerKg: 7,
    });

    expect(flags(markParetoSolutions([first, second, dominated]))).toEqual({
      first: true,
      second: true,
      dominated: false,
    });
  });

  it('ignores duplicate metrics without changing the front', () => {
    const better = solution('better', {
      totalMassKg: 1,
      fepAreaM2: 1,
      powerToMassWPerKg: 10,
    });
    const worse = solution('worse', {
      totalMassKg: 2,
      fepAreaM2: 2,
      powerToMassWPerKg: 5,
    });
    const uniqueCriteria: readonly ParetoMetric[] = ['totalMassKg', 'fepAreaM2'];
    const duplicatedCriteria: readonly ParetoMetric[] = [
      'totalMassKg',
      'totalMassKg',
      'fepAreaM2',
      'fepAreaM2',
    ];

    expect(flags(markParetoSolutions([better, worse], duplicatedCriteria))).toEqual(
      flags(markParetoSolutions([better, worse], uniqueCriteria)),
    );
  });

  it('changes the front when criteria are a subset', () => {
    const light = solution('light', {
      totalMassKg: 1,
      fepAreaM2: 10,
      powerToMassWPerKg: 2,
    });
    const efficient = solution('efficient', {
      totalMassKg: 10,
      fepAreaM2: 1,
      powerToMassWPerKg: 20,
    });

    expect(flags(markParetoSolutions([light, efficient]))).toEqual({
      light: true,
      efficient: true,
    });
    expect(flags(markParetoSolutions([light, efficient], ['totalMassKg']))).toEqual({
      light: true,
      efficient: false,
    });
    expect(flags(markParetoSolutions([light, efficient], ['powerToMassWPerKg']))).toEqual({
      light: false,
      efficient: true,
    });
  });

  it('does not mutate the input array or objects', () => {
    const first = solution('first', {
      totalMassKg: 1,
      fepAreaM2: 1,
      powerToMassWPerKg: 10,
    });
    const second = solution('second', {
      totalMassKg: 2,
      fepAreaM2: 2,
      powerToMassWPerKg: 5,
    });
    const input = Object.freeze([Object.freeze(first), Object.freeze(second)]);
    const snapshot = structuredClone(input);

    const marked = markParetoSolutions(input);

    expect(input).toEqual(snapshot);
    expect(input[0]?.isPareto).toBe(false);
    expect(input[1]?.isPareto).toBe(false);
    expect(marked).not.toBe(input);
    expect(marked[0]).not.toBe(input[0]);
    expect(marked[1]).not.toBe(input[1]);
    expect(flags(marked)).toEqual({ first: true, second: false });
  });

  it('is deterministic for flags and input order', () => {
    const solutions = [
      solution('c', {
        totalMassKg: 4,
        fepAreaM2: 4,
        powerToMassWPerKg: 3,
      }),
      solution('a', {
        totalMassKg: 1,
        fepAreaM2: 3,
        powerToMassWPerKg: 9,
      }),
      solution('b', {
        totalMassKg: 3,
        fepAreaM2: 1,
        powerToMassWPerKg: 8,
      }),
    ];

    const first = markParetoSolutions(solutions);
    const second = markParetoSolutions(solutions);

    expect(ids(first)).toEqual(['c', 'a', 'b']);
    expect(ids(first)).toEqual(ids(second));
    expect(flags(first)).toEqual(flags(second));
    expect(flags(first)).toEqual({
      c: false,
      a: true,
      b: true,
    });
  });

  it('uses the default trio when criteria are omitted', () => {
    const better = solution('better', {
      totalMassKg: 1,
      fepAreaM2: 1,
      powerToMassWPerKg: 10,
    });
    const worse = solution('worse', {
      totalMassKg: 2,
      fepAreaM2: 2,
      powerToMassWPerKg: 5,
    });

    expect(flags(markParetoSolutions([better, worse]))).toEqual(
      flags(markParetoSolutions([better, worse], DEFAULT_PARETO_CRITERIA)),
    );
  });

  it('marks every solution when the criteria list is empty', () => {
    const better = solution('better', {
      totalMassKg: 1,
      fepAreaM2: 1,
      powerToMassWPerKg: 10,
    });
    const worse = solution('worse', {
      totalMassKg: 2,
      fepAreaM2: 2,
      powerToMassWPerKg: 5,
    });

    expect(flags(markParetoSolutions([better, worse], []))).toEqual({
      better: true,
      worse: true,
    });
  });

  it('rejects unknown criteria instead of skipping them', () => {
    const only = solution('only', {
      totalMassKg: 1,
      fepAreaM2: 1,
      powerToMassWPerKg: 10,
    });
    const unknown = 'notAMetric' as unknown as ParetoMetric;

    expect(() => markParetoSolutions([only], [unknown])).toThrow(ParetoError);
    expect(() => markParetoSolutions([only], [unknown])).toThrow(
      'Unknown Pareto metric: notAMetric',
    );
  });

  it('returns a new empty array for an empty input', () => {
    const input: SepSolution[] = [];

    const marked = markParetoSolutions(input);

    expect(marked).toEqual([]);
    expect(marked).not.toBe(input);
  });
});
