import type { SepCalculationResult, SepSolution } from '@sep/core';

export interface CalculationSummary {
  totalGenerated: number;
  totalFeasible: number;
  paretoCount: number;
  minMassKg: number | undefined;
  maxWPerKg: number | undefined;
  minFepAreaM2: number | undefined;
}

export function buildSummary(result: SepCalculationResult): CalculationSummary {
  const paretoCount = result.solutions.filter((solution) => solution.isPareto).length;

  if (result.solutions.length === 0) {
    return {
      totalGenerated: result.totalGenerated,
      totalFeasible: result.totalFeasible,
      paretoCount,
      minMassKg: undefined,
      maxWPerKg: undefined,
      minFepAreaM2: undefined,
    };
  }

  return {
    totalGenerated: result.totalGenerated,
    totalFeasible: result.totalFeasible,
    paretoCount,
    minMassKg: extremeBy(result.solutions, (solution) => solution.totalMassKg, 'min'),
    maxWPerKg: extremeBy(result.solutions, (solution) => solution.powerToMassWPerKg, 'max'),
    minFepAreaM2: extremeBy(result.solutions, (solution) => solution.fepAreaM2, 'min'),
  };
}

function extremeBy(
  solutions: readonly SepSolution[],
  read: (solution: SepSolution) => number,
  sense: 'min' | 'max',
): number | undefined {
  const first = solutions[0];
  if (first === undefined) {
    return undefined;
  }

  let best = read(first);
  for (const solution of solutions.slice(1)) {
    const value = read(solution);
    if (sense === 'min' ? value < best : value > best) {
      best = value;
    }
  }
  return best;
}
