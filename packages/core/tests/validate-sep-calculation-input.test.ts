import { describe, expect, it } from 'vitest';
import {
  SepCalculationError,
  validateSepCalculationInput,
} from '../src/index';
import type { SepCalculationInput } from '../src/index';

const VALID_INPUT: SepCalculationInput = {
  altitudeKm: 1200,
  maxMassKg: 100,
  requiredPowerW: 2500,
  maxPanelAreaM2: 5,
  panelCount: 2,
  photovoltaicCells: [
    {
      id: 'user-fep',
      name: 'User FEP',
      efficiency: 0.3,
    },
  ],
  structures: ['honeycomb', 'frame'],
  concentratorMaterials: [
    {
      id: 'bk7',
      name: 'BK7',
      densityGPerCm3: 2.5,
    },
  ],
};

function validInput(overrides: Partial<SepCalculationInput> = {}): SepCalculationInput {
  return {
    ...VALID_INPUT,
    photovoltaicCells: VALID_INPUT.photovoltaicCells.map((cell) => ({ ...cell })),
    structures: [...VALID_INPUT.structures],
    concentratorMaterials: VALID_INPUT.concentratorMaterials.map((material) => ({
      ...material,
    })),
    ...overrides,
  };
}

function expectInvalid(input: SepCalculationInput, messagePattern: RegExp): void {
  expect(() => validateSepCalculationInput(input)).toThrow(SepCalculationError);
  expect(() => validateSepCalculationInput(input)).toThrow(messagePattern);
}

describe('validateSepCalculationInput', () => {
  it('accepts a complete valid input', () => {
    expect(() => validateSepCalculationInput(validInput())).not.toThrow();
  });

  it('accepts an empty concentratorMaterials list', () => {
    expect(() =>
      validateSepCalculationInput(validInput({ concentratorMaterials: [] })),
    ).not.toThrow();
  });

  it('accepts altitude boundaries 400 and 3600', () => {
    expect(() => validateSepCalculationInput(validInput({ altitudeKm: 400 }))).not.toThrow();
    expect(() => validateSepCalculationInput(validInput({ altitudeKm: 3600 }))).not.toThrow();
  });

  it('rejects altitude outside 400..3600', () => {
    expectInvalid(validInput({ altitudeKm: 399 }), /altitudeKm/);
    expectInvalid(validInput({ altitudeKm: 3601 }), /altitudeKm/);
  });

  it('rejects non-positive mass, power and panel area', () => {
    expectInvalid(validInput({ maxMassKg: 0 }), /maxMassKg/);
    expectInvalid(validInput({ requiredPowerW: 0 }), /requiredPowerW/);
    expectInvalid(validInput({ maxPanelAreaM2: 0 }), /maxPanelAreaM2/);
    expectInvalid(validInput({ maxMassKg: -1 }), /maxMassKg/);
  });

  it('rejects a non-positive or non-integer panelCount', () => {
    expectInvalid(validInput({ panelCount: 0 }), /panelCount/);
    expectInvalid(validInput({ panelCount: 1.5 }), /panelCount/);
    expectInvalid(validInput({ panelCount: -2 }), /panelCount/);
  });

  it('rejects empty photovoltaicCells and structures', () => {
    expectInvalid(validInput({ photovoltaicCells: [] }), /photovoltaicCells/);
    expectInvalid(validInput({ structures: [] }), /structures/);
  });

  it('rejects efficiency outside 0 < eta <= 1', () => {
    expectInvalid(
      validInput({
        photovoltaicCells: [{ id: 'fep', name: 'FEP', efficiency: 0 }],
      }),
      /efficiency/,
    );
    expectInvalid(
      validInput({
        photovoltaicCells: [{ id: 'fep', name: 'FEP', efficiency: 1.01 }],
      }),
      /efficiency/,
    );
  });

  it('accepts efficiency = 1', () => {
    expect(() =>
      validateSepCalculationInput(
        validInput({
          photovoltaicCells: [{ id: 'fep', name: 'FEP', efficiency: 1 }],
        }),
      ),
    ).not.toThrow();
  });

  it('rejects non-positive material density', () => {
    expectInvalid(
      validInput({
        concentratorMaterials: [{ id: 'bk7', name: 'BK7', densityGPerCm3: 0 }],
      }),
      /densityGPerCm3/,
    );
  });

  it('rejects NaN and Infinity on numeric fields', () => {
    expectInvalid(validInput({ altitudeKm: Number.NaN }), /altitudeKm/);
    expectInvalid(validInput({ maxMassKg: Number.POSITIVE_INFINITY }), /maxMassKg/);
    expectInvalid(validInput({ requiredPowerW: Number.NEGATIVE_INFINITY }), /requiredPowerW/);
  });

  it('rejects empty or duplicate FEP ids and empty names', () => {
    expectInvalid(
      validInput({
        photovoltaicCells: [{ id: '', name: 'FEP', efficiency: 0.3 }],
      }),
      /photovoltaicCells\[0\]\.id/,
    );
    expectInvalid(
      validInput({
        photovoltaicCells: [{ id: 'fep', name: '   ', efficiency: 0.3 }],
      }),
      /photovoltaicCells\[0\]\.name/,
    );
    expectInvalid(
      validInput({
        photovoltaicCells: [
          { id: 'fep', name: 'A', efficiency: 0.3 },
          { id: 'fep', name: 'B', efficiency: 0.4 },
        ],
      }),
      /duplicate id 'fep'/,
    );
  });

  it('rejects empty or duplicate material ids and empty names', () => {
    expectInvalid(
      validInput({
        concentratorMaterials: [{ id: '', name: 'BK7', densityGPerCm3: 2.5 }],
      }),
      /concentratorMaterials\[0\]\.id/,
    );
    expectInvalid(
      validInput({
        concentratorMaterials: [{ id: 'bk7', name: '', densityGPerCm3: 2.5 }],
      }),
      /concentratorMaterials\[0\]\.name/,
    );
    expectInvalid(
      validInput({
        concentratorMaterials: [
          { id: 'bk7', name: 'BK7', densityGPerCm3: 2.5 },
          { id: 'bk7', name: 'Other', densityGPerCm3: 2.2 },
        ],
      }),
      /duplicate id 'bk7'/,
    );
  });

  it('does not clamp out-of-range values', () => {
    const input = validInput({ altitudeKm: 399 });
    expect(() => validateSepCalculationInput(input)).toThrow(SepCalculationError);
    expect(input.altitudeKm).toBe(399);
  });
});
