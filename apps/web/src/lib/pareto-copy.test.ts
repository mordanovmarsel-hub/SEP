import { DEFAULT_PARETO_CRITERIA } from '@sep/core';
import { describe, expect, it } from 'vitest';
import {
  formatParetoCriterionLabel,
  PARETO_EXPLANATION,
  resolveParetoCriteria,
} from './pareto-copy.ts';

describe('pareto copy', () => {
  it('explains non-dominance without calling a Pareto point best on every metric', () => {
    expect(PARETO_EXPLANATION).toMatch(/не хуже по всем выбранным критериям/);
    expect(PARETO_EXPLANATION).toMatch(/строго лучше хотя бы по одному/);
    expect(PARETO_EXPLANATION.toLowerCase()).not.toMatch(
      /лучшее по всем параметрам/,
    );
  });

  it('shows the current default criteria in human-readable form', () => {
    expect(resolveParetoCriteria()).toEqual(DEFAULT_PARETO_CRITERIA);
    expect(formatParetoCriterionLabel('totalMassKg')).toBe(
      'Масса — меньше лучше',
    );
    expect(formatParetoCriterionLabel('fepAreaM2')).toBe(
      'Площадь ФЭП — меньше лучше',
    );
    expect(formatParetoCriterionLabel('powerToMassWPerKg')).toBe(
      'Удельная мощность, Вт/кг — больше лучше',
    );
  });
});
