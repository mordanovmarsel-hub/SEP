import type { ParetoMetric, SepSolution } from '../models';
import { markParetoSolutions as markParetoSolutionsImpl } from './mark-pareto-solutions';

export { ParetoError } from './mark-pareto-solutions';

/**
 * Canonical name: `markParetoSolutions`.
 *
 * Default criteria: minimize totalMassKg, minimize fepAreaM2,
 * maximize powerToMassWPerKg. A dominates B when A is no worse
 * on every selected metric and strictly better on at least one.
 *
 * Must not mutate `solutions`. Must be deterministic.
 */
export type MarkParetoSolutions = (
  solutions: readonly SepSolution[],
  criteria?: readonly ParetoMetric[],
) => SepSolution[];

export const markParetoSolutions: MarkParetoSolutions = markParetoSolutionsImpl;
