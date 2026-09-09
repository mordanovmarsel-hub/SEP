import { SepCalculationError } from '@sep/core';
import { FormValidationError } from './form.ts';

const CORE_MESSAGE_MAP: readonly { pattern: RegExp; message: string }[] = [
  {
    pattern: /altitudeKm/,
    message: 'Высота орбиты должна быть от 400 до 3600 км.',
  },
  {
    pattern: /maxMassKg/,
    message: 'Максимальная масса СЭП должна быть больше 0.',
  },
  {
    pattern: /requiredPowerW/,
    message: 'Требуемая средняя мощность должна быть больше 0.',
  },
  {
    pattern: /maxPanelAreaM2/,
    message: 'Максимальная площадь панели должна быть больше 0.',
  },
  {
    pattern: /panelCount/,
    message: 'Количество панелей должно быть целым числом больше 0.',
  },
  {
    pattern: /photovoltaicCells.*efficiency|efficiency/,
    message: 'КПД ФЭП должен быть больше 0% и не больше 100%.',
  },
  {
    pattern: /photovoltaicCells/,
    message: 'Добавьте хотя бы один ФЭП с названием и КПД.',
  },
  {
    pattern: /structures/,
    message: 'Выберите хотя бы одну конструкцию: сотопанель или каркас.',
  },
  {
    pattern: /concentratorMaterials/,
    message: 'Проверьте выбранные материалы концентратора.',
  },
];

export function mapCalculationError(error: unknown): string {
  if (error instanceof FormValidationError) {
    return error.message;
  }

  if (error instanceof SepCalculationError) {
    for (const entry of CORE_MESSAGE_MAP) {
      if (entry.pattern.test(error.message)) {
        return entry.message;
      }
    }
    return error.message;
  }

  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  return 'Не удалось выполнить расчёт. Проверьте входные данные.';
}
