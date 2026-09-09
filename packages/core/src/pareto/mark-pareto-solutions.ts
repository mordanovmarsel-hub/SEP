import {
  DEFAULT_PARETO_CRITERIA,
  PARETO_METRIC_SENSE,
} from '../models';
import type { ParetoMetric, ParetoSense, SepSolution } from '../models';

export class ParetoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParetoError';
  }
}

function isParetoMetric(value: string): value is ParetoMetric {
  return value === 'totalMassKg' || value === 'fepAreaM2' || value === 'powerToMassWPerKg';
}

/**
 * Resolve caller criteria: omitted → default trio; duplicates dropped
 * in first-seen order; unknown metrics are rejected (no silent skip).
 * An explicit empty list is valid and means no comparison dimensions.
 */
function resolveCriteria(criteria: readonly ParetoMetric[] | undefined): ParetoMetric[] {
  const source = criteria ?? DEFAULT_PARETO_CRITERIA;
  const seen = new Set<ParetoMetric>();
  const resolved: ParetoMetric[] = [];

  for (const metric of source) {
    if (!isParetoMetric(metric)) {
      throw new ParetoError(`Unknown Pareto metric: ${String(metric)}`);
    }

    if (!seen.has(metric)) {
      seen.add(metric);
      resolved.push(metric);
    }
  }

  return resolved;
}

function isBetter(left: number, right: number, sense: ParetoSense): boolean {
  return sense === 'minimize' ? left < right : left > right;
}

function isWorse(left: number, right: number, sense: ParetoSense): boolean {
  return sense === 'minimize' ? left > right : left < right;
}

/**
 * A dominates B when A is no worse on every selected criterion and
 * strictly better on at least one, using {@link PARETO_METRIC_SENSE}.
 * Equal vectors never dominate each other (both stay non-dominated).
 */
function dominates(
  candidate: SepSolution,
  other: SepSolution,
  criteria: readonly ParetoMetric[],
): boolean {
  let strictlyBetter = false;

  for (const metric of criteria) {
    const sense = PARETO_METRIC_SENSE[metric];
    const candidateValue = candidate[metric];
    const otherValue = other[metric];

    if (isWorse(candidateValue, otherValue, sense)) {
      return false;
    }

    if (isBetter(candidateValue, otherValue, sense)) {
      strictlyBetter = true;
    }
  }

  return strictlyBetter;
}

function isDominated(
  solution: SepSolution,
  solutions: readonly SepSolution[],
  criteria: readonly ParetoMetric[],
): boolean {
  return solutions.some((other) => dominates(other, solution, criteria));
}

/**
 * Mark non-dominated solutions. Returns new objects in input order.
 * Does not mutate `solutions` or the objects inside it.
 */
export function markParetoSolutions(
  solutions: readonly SepSolution[],
  criteria?: readonly ParetoMetric[],
): SepSolution[] {
  const resolvedCriteria = resolveCriteria(criteria);

  return solutions.map((solution) => ({
    ...solution,
    isPareto: !isDominated(solution, solutions, resolvedCriteria),
  }));
}
