import type { ConcentratorMaterial, StructureType } from '@sep/core';
import { CONCENTRATOR_MATERIALS } from '@sep/data';
import { percentToEfficiencyFraction } from './efficiency.ts';

export interface FepDraft {
  id: string;
  name: string;
  efficiencyPercent: string;
}

export interface CalculationFormValues {
  altitudeKm: string;
  maxMassKg: string;
  requiredPowerW: string;
  maxPanelAreaM2: string;
  panelCount: string;
  feps: readonly FepDraft[];
  selectedStructures: readonly StructureType[];
  selectedMaterialIds: readonly string[];
}

export class FormValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormValidationError';
  }
}

export function nextFepId(feps: readonly FepDraft[]): string {
  const used = new Set(feps.map((fep) => fep.id));
  let index = 1;
  while (used.has(`fep-${String(index)}`)) {
    index += 1;
  }
  return `fep-${String(index)}`;
}

export function createFepDraft(feps: readonly FepDraft[]): FepDraft {
  const id = nextFepId(feps);
  const ordinal = id.slice('fep-'.length);
  return {
    id,
    name: `ФЭП ${ordinal}`,
    efficiencyPercent: '30',
  };
}

export const DEFAULT_FORM: CalculationFormValues = {
  altitudeKm: '800',
  maxMassKg: '20',
  requiredPowerW: '20',
  maxPanelAreaM2: '0.3',
  panelCount: '1',
  feps: [createFepDraft([])],
  selectedStructures: ['honeycomb', 'frame'],
  selectedMaterialIds: CONCENTRATOR_MATERIALS.map((material) => material.id),
};

function parseFiniteNumber(raw: string, label: string): number {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') {
    throw new FormValidationError(`${label}: укажите число.`);
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new FormValidationError(
      `${label}: ожидается конечное число, получено «${raw}».`,
    );
  }

  return value;
}

function parsePositiveInteger(raw: string, label: string): number {
  const value = parseFiniteNumber(raw, label);
  if (!Number.isInteger(value) || value <= 0) {
    throw new FormValidationError(
      `${label}: ожидается целое число больше 0, получено «${raw}».`,
    );
  }
  return value;
}

export interface BuiltCalculationInput {
  altitudeKm: number;
  maxMassKg: number;
  requiredPowerW: number;
  maxPanelAreaM2: number;
  panelCount: number;
  photovoltaicCells: readonly {
    id: string;
    name: string;
    efficiency: number;
  }[];
  structures: readonly StructureType[];
  concentratorMaterials: readonly ConcentratorMaterial[];
}

/**
 * Parses the UI form and converts efficiency % → fraction for `calculateSep`.
 */
export function buildCalculationInput(
  form: CalculationFormValues,
): BuiltCalculationInput {
  const altitudeKm = parseFiniteNumber(form.altitudeKm, 'Высота орбиты');
  if (altitudeKm < 400 || altitudeKm > 3600) {
    throw new FormValidationError(
      'Высота орбиты должна быть от 400 до 3600 км.',
    );
  }

  const maxMassKg = parseFiniteNumber(form.maxMassKg, 'Максимальная масса СЭП');
  if (maxMassKg <= 0) {
    throw new FormValidationError('Максимальная масса СЭП должна быть больше 0.');
  }

  const requiredPowerW = parseFiniteNumber(
    form.requiredPowerW,
    'Требуемая средняя мощность',
  );
  if (requiredPowerW <= 0) {
    throw new FormValidationError(
      'Требуемая средняя мощность должна быть больше 0.',
    );
  }

  const maxPanelAreaM2 = parseFiniteNumber(
    form.maxPanelAreaM2,
    'Максимальная площадь панели',
  );
  if (maxPanelAreaM2 <= 0) {
    throw new FormValidationError(
      'Максимальная площадь панели должна быть больше 0.',
    );
  }

  const panelCount = parsePositiveInteger(form.panelCount, 'Количество панелей');

  if (form.feps.length === 0) {
    throw new FormValidationError('Добавьте хотя бы один ФЭП.');
  }

  const photovoltaicCells = form.feps.map((fep, index) => {
    const name = fep.name.trim();
    if (name === '') {
      throw new FormValidationError(
        `Название ФЭП №${String(index + 1)} не должно быть пустым.`,
      );
    }

    const efficiencyPercent = parseFiniteNumber(
      fep.efficiencyPercent,
      `КПД «${name}»`,
    );
    if (efficiencyPercent <= 0 || efficiencyPercent > 100) {
      throw new FormValidationError(
        `КПД «${name}» задаётся в процентах: больше 0 и не больше 100.`,
      );
    }

    return {
      id: fep.id,
      name,
      efficiency: percentToEfficiencyFraction(efficiencyPercent),
    };
  });

  const cellIds = photovoltaicCells.map((cell) => cell.id);
  if (new Set(cellIds).size !== cellIds.length) {
    throw new FormValidationError('Идентификаторы ФЭП должны быть уникальными.');
  }

  if (form.selectedStructures.length === 0) {
    throw new FormValidationError('Выберите хотя бы одну конструкцию.');
  }

  const selectedMaterialIds = new Set(form.selectedMaterialIds);
  const concentratorMaterials = CONCENTRATOR_MATERIALS.filter((material) =>
    selectedMaterialIds.has(material.id),
  ).map((material) => ({
    id: material.id,
    name: material.name,
    densityGPerCm3: material.densityGPerCm3,
  }));

  return {
    altitudeKm,
    maxMassKg,
    requiredPowerW,
    maxPanelAreaM2,
    panelCount,
    photovoltaicCells,
    structures: [...form.selectedStructures],
    concentratorMaterials,
  };
}
