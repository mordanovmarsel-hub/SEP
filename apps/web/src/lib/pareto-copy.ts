import {
  DEFAULT_PARETO_CRITERIA,
  PARETO_METRIC_SENSE,
  type ParetoMetric,
} from '@sep/core';

export const PARETO_CRITERION_LABELS = {
  totalMassKg: 'Масса',
  fepAreaM2: 'Площадь ФЭП',
  powerToMassWPerKg: 'Удельная мощность, Вт/кг',
} as const satisfies Record<ParetoMetric, string>;

const SENSE_COPY = {
  minimize: 'меньше лучше',
  maximize: 'больше лучше',
} as const;

export const PARETO_EXPLANATION =
  'Парето-оптимальное решение — это допустимая конфигурация, для которой нет другого решения, которое было бы не хуже по всем выбранным критериям и строго лучше хотя бы по одному из них.';

export function resolveParetoCriteria(
  criteria: readonly ParetoMetric[] = DEFAULT_PARETO_CRITERIA,
): readonly ParetoMetric[] {
  return criteria;
}

export function formatParetoCriterionLabel(metric: ParetoMetric): string {
  return `${PARETO_CRITERION_LABELS[metric]} — ${SENSE_COPY[PARETO_METRIC_SENSE[metric]]}`;
}
