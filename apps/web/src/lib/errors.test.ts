import { describe, expect, it } from 'vitest';
import { SepCalculationError, calculateSep } from '@sep/core';
import type { SepCalculationInput } from '@sep/core';
import { mapCalculationError } from './errors.ts';
import { FormValidationError } from './form.ts';

const VALID_INPUT: SepCalculationInput = {
  altitudeKm: 1200,
  maxMassKg: 20,
  requiredPowerW: 1,
  maxPanelAreaM2: 0.2,
  panelCount: 1,
  photovoltaicCells: [{ id: 'fep-1', name: 'ФЭП 1', efficiency: 0.3 }],
  structures: ['frame'],
  concentratorMaterials: [],
};

function thrownSepError(run: () => void): SepCalculationError {
  try {
    run();
  } catch (error) {
    if (error instanceof SepCalculationError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected SepCalculationError');
}

describe('mapCalculationError', () => {
  it('maps overflowed S_max, not maxPanelAreaM2 <= 0', () => {
    const error = thrownSepError(() => {
      calculateSep({
        ...VALID_INPUT,
        maxPanelAreaM2: Number.MAX_VALUE,
        panelCount: 2,
      });
    });

    expect(error.message).toMatch(/overflowed/);
    const mapped = mapCalculationError(error);
    expect(mapped).toMatch(/переполн|слишком велик/i);
    expect(mapped).not.toBe('Максимальная площадь панели должна быть больше 0.');
  });

  it('maps the area-tick cap to a Russian enumeration-limit message', () => {
    const error = thrownSepError(() => {
      calculateSep({
        ...VALID_INPUT,
        maxPanelAreaM2: 100_000,
        panelCount: 1,
      });
    });

    expect(error.message).toMatch(/area tick count|MAX_AREA_TICK_COUNT/);
    const mapped = mapCalculationError(error);
    expect(mapped).toMatch(/предел перебора|слишком велик/i);
    expect(mapped).not.toMatch(/area tick count/);
    expect(mapped).not.toBe('Максимальная площадь панели должна быть больше 0.');
  });

  it('keeps the area > 0 message only for genuine maxPanelAreaM2 <= 0', () => {
    const error = thrownSepError(() => {
      calculateSep({ ...VALID_INPUT, maxPanelAreaM2: 0 });
    });

    expect(error.message).toMatch(/maxPanelAreaM2/);
    expect(error.message).not.toMatch(/overflowed|area tick count/);
    expect(mapCalculationError(error)).toBe(
      'Максимальная площадь панели должна быть больше 0.',
    );
  });

  it('passes FormValidationError messages through unchanged', () => {
    expect(mapCalculationError(new FormValidationError('Поле неверно.'))).toBe(
      'Поле неверно.',
    );
  });
});
