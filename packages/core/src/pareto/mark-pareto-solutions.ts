import {
  DEFAULT_PARETO_CRITERIA,
  PARETO_METRIC_SENSE,
} from '../models';
import type { ParetoMetric, SepSolution } from '../models';

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

function toMinimizeValues(
  solution: SepSolution,
  criteria: readonly ParetoMetric[],
): number[] {
  return criteria.map((metric) => {
    const raw = solution[metric];
    return PARETO_METRIC_SENSE[metric] === 'maximize' ? -raw : raw;
  });
}

/**
 * A dominates B in minimize-space when A is <= on every coordinate
 * and strictly < on at least one. Equal vectors do not dominate.
 */
function dominatesMinimize(
  candidate: readonly number[],
  other: readonly number[],
): boolean {
  let strictlyBetter = false;

  for (let index = 0; index < candidate.length; index += 1) {
    const candidateValue = candidate[index];
    const otherValue = other[index];
    if (candidateValue === undefined || otherValue === undefined) {
      return false;
    }
    if (candidateValue > otherValue) {
      return false;
    }
    if (candidateValue < otherValue) {
      strictlyBetter = true;
    }
  }

  return strictlyBetter;
}

/**
 * Mark non-dominated solutions. Returns new objects in input order.
 * Does not mutate `solutions` or the objects inside it.
 *
 * Same dominance relation as the naive pairwise scan: lex-sort in
 * minimize-space, then compare each point only to the current front.
 * Ties stay mutually non-dominated.
 */
export function markParetoSolutions(
  solutions: readonly SepSolution[],
  criteria?: readonly ParetoMetric[],
): SepSolution[] {
  const resolvedCriteria = resolveCriteria(criteria);

  if (resolvedCriteria.length === 0) {
    return solutions.map((solution) => ({ ...solution, isPareto: true }));
  }

  const values = solutions.map((solution) => toMinimizeValues(solution, resolvedCriteria));
  const order = solutions.map((_, index) => index);
  order.sort((left, right) => {
    const leftValues = values[left];
    const rightValues = values[right];
    if (leftValues === undefined || rightValues === undefined) {
      return left - right;
    }
    for (let index = 0; index < leftValues.length; index += 1) {
      const delta = (leftValues[index] ?? 0) - (rightValues[index] ?? 0);
      if (delta !== 0) {
        return delta;
      }
    }
    return left - right;
  });

  const isPareto = solutions.map(() => false);
  const front: number[] = [];

  for (const index of order) {
    const current = values[index];
    if (current === undefined) {
      continue;
    }

    let dominated = false;
    for (const frontIndex of front) {
      const frontValues = values[frontIndex];
      if (frontValues !== undefined && dominatesMinimize(frontValues, current)) {
        dominated = true;
        break;
      }
    }

    if (!dominated) {
      isPareto[index] = true;
      front.push(index);
    }
  }

  return solutions.map((solution, index) => ({
    ...solution,
    isPareto: isPareto[index] === true,
  }));
}
