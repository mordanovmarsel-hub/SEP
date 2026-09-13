import { STRUCTURE_LABELS } from '@sep/data';
import type { SepSolution, StructureType } from '@sep/core';

export function formatAreaM2(value: number): string {
  return value.toFixed(2);
}

export function formatCosine(value: number): string {
  return value.toFixed(4);
}

export function formatPowerW(value: number): string {
  return value.toFixed(1);
}

export function formatMassKg(value: number): string {
  return value.toFixed(3);
}

export function formatWPerKg(value: number): string {
  return value.toFixed(2);
}

export function formatAltitudeKm(value: number): string {
  return String(value);
}

export function formatConcentration(value: number): string {
  return String(value);
}

export function formatEfficiencyPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export const CONCENTRATOR_ABSENT_LABEL = 'Концентратор отсутствует';

export function formatMaterialName(
  name: string | null,
  concentration?: number,
): string {
  if (concentration === 1 || name === null) {
    return CONCENTRATOR_ABSENT_LABEL;
  }
  return name;
}

export function formatStructure(type: StructureType): string {
  return STRUCTURE_LABELS[type];
}

export function formatParetoLabel(isPareto: boolean): string {
  return isPareto ? 'Парето' : '';
}

export function formatSolutionHover(solution: SepSolution): string {
  return [
    `ФЭП: ${solution.photovoltaicCellName}`,
    `Конструкция: ${formatStructure(solution.structureType)}`,
    `Материал: ${formatMaterialName(solution.concentratorMaterialName, solution.concentration)}`,
    `K: ${formatConcentration(solution.concentration)}`,
    `S_SEP: ${formatAreaM2(solution.sepAreaM2)} м²`,
    `S_FEP: ${formatAreaM2(solution.fepAreaM2)} м²`,
    `P: ${formatPowerW(solution.averagePowerW)} Вт`,
    `M: ${formatMassKg(solution.totalMassKg)} кг`,
    `Вт/кг: ${formatWPerKg(solution.powerToMassWPerKg)}`,
    `Парето: ${solution.isPareto ? 'да' : 'нет'}`,
  ].join('<br>');
}
