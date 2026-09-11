import { describe, expect, it } from 'vitest';
import {
  CONCENTRATOR_ABSENT_LABEL,
  formatAreaM2,
  formatCosine,
  formatEfficiencyPercent,
  formatMassKg,
  formatMaterialName,
  formatParetoLabel,
  formatPowerW,
  formatSolutionHover,
  formatStructure,
  formatWPerKg,
} from './format.ts';
import { efficiencyFractionToPercent, percentToEfficiencyFraction } from './efficiency.ts';
import { testSolution } from './test-solution.ts';

describe('display formatters', () => {
  it('formats area, cosine, power and mass for reading only', () => {
    expect(formatAreaM2(0.1)).toBe('0.10');
    expect(formatCosine(0.7084)).toBe('0.7084');
    expect(formatPowerW(28.94)).toBe('28.9');
    expect(formatMassKg(0.326)).toBe('0.326');
    expect(formatWPerKg(88.773)).toBe('88.77');
  });

  it('shows efficiency as percent and K=1 as «Концентратор отсутствует»', () => {
    expect(formatEfficiencyPercent(0.3)).toBe('30.0%');
    expect(formatMaterialName(null)).toBe(CONCENTRATOR_ABSENT_LABEL);
    expect(formatMaterialName(null, 1)).toBe(CONCENTRATOR_ABSENT_LABEL);
    expect(formatMaterialName('BK7', 1)).toBe(CONCENTRATOR_ABSENT_LABEL);
    expect(formatMaterialName('BK7', 2)).toBe('BK7');
    expect(formatMaterialName('BK7')).toBe('BK7');
    expect(formatStructure('honeycomb')).toBe('Сотопанель');
    expect(formatStructure('frame')).toBe('Каркас');
    expect(formatParetoLabel(true)).toBe('Парето');
    expect(formatParetoLabel(false)).toBe('');
  });

  it('uses the same concentrator label in the 3D tooltip', () => {
    const withoutConcentrator = testSolution({
      id: 'k1',
      concentration: 1,
      concentratorMaterialId: null,
      concentratorMaterialName: null,
    });
    const withMaterial = testSolution({
      id: 'k2',
      concentration: 2,
      concentratorMaterialName: 'BK7',
    });

    expect(formatSolutionHover(withoutConcentrator)).toContain(
      `Материал: ${CONCENTRATOR_ABSENT_LABEL}`,
    );
    expect(formatSolutionHover(withMaterial)).toContain('Материал: BK7');
  });
});

describe('efficiency conversion', () => {
  it('converts UI percent to a core fraction and back', () => {
    expect(percentToEfficiencyFraction(30)).toBe(0.3);
    expect(percentToEfficiencyFraction(100)).toBe(1);
    expect(efficiencyFractionToPercent(0.3)).toBe(30);
  });
});
