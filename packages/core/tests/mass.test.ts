import { describe, expect, it } from 'vitest';
import {
  MassCalculationError,
  calculateMass,
} from '../src/index';
import type { MassParams, StructureType } from '../src/index';

const MASS_TOLERANCE_KG = 1e-9;

const VALID_CONCENTRATOR_PARAMS: MassParams = {
  sepAreaM2: 10,
  concentration: 2,
  structureType: 'honeycomb',
  concentratorDensityGPerCm3: 2.5,
};

function expectCloseToKg(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(MASS_TOLERANCE_KG);
}

function expectMassResult(
  actual: ReturnType<typeof calculateMass>,
  expected: { structureMassKg: number; concentratorMassKg: number; totalMassKg: number },
): void {
  expectCloseToKg(actual.structureMassKg, expected.structureMassKg);
  expectCloseToKg(actual.concentratorMassKg, expected.concentratorMassKg);
  expectCloseToKg(actual.totalMassKg, expected.totalMassKg);
}

describe('calculateMass', () => {
  describe('regression', () => {
    it('computes honeycomb mass without a concentrator at K=1', () => {
      const actual = calculateMass({
        sepAreaM2: 10,
        concentration: 1,
        structureType: 'honeycomb',
      });

      expectMassResult(actual, {
        structureMassKg: 16.3,
        concentratorMassKg: 0,
        totalMassKg: 16.3,
      });
    });

    it('computes frame mass without a concentrator at K=1', () => {
      const actual = calculateMass({
        sepAreaM2: 10,
        concentration: 1,
        structureType: 'frame',
      });

      expectMassResult(actual, {
        structureMassKg: 16.9,
        concentratorMassKg: 0,
        totalMassKg: 16.9,
      });
    });

    it('accepts a null concentrator density at K=1', () => {
      const actual = calculateMass({
        sepAreaM2: 10,
        concentration: 1,
        structureType: 'honeycomb',
        concentratorDensityGPerCm3: null,
      });

      expectMassResult(actual, {
        structureMassKg: 16.3,
        concentratorMassKg: 0,
        totalMassKg: 16.3,
      });
    });

    it('computes honeycomb + BK7 mass at K=2', () => {
      const actual = calculateMass({
        sepAreaM2: 10,
        concentration: 2,
        structureType: 'honeycomb',
        concentratorDensityGPerCm3: 2.5,
      });

      expectMassResult(actual, {
        structureMassKg: 16.3,
        concentratorMassKg: 50,
        totalMassKg: 66.3,
      });
    });

    it('reproduces the CaF2 + frame regression fixture', () => {
      const actual = calculateMass({
        sepAreaM2: 8.5,
        concentration: 4,
        structureType: 'frame',
        concentratorDensityGPerCm3: 3.18,
      });

      expectMassResult(actual, {
        structureMassKg: 14.365,
        concentratorMassKg: 54.06,
        totalMassKg: 68.425,
      });
    });
  });

  describe('concentrator material table', () => {
    it.each([
      { densityGPerCm3: 3.18, expectedSigmaKgPerM2: 6.36 },
      { densityGPerCm3: 3.177, expectedSigmaKgPerM2: 6.354 },
      { densityGPerCm3: 2.5, expectedSigmaKgPerM2: 5 },
      { densityGPerCm3: 2.202, expectedSigmaKgPerM2: 4.404 },
      { densityGPerCm3: 2.649, expectedSigmaKgPerM2: 5.298 },
    ])(
      'maps rho=$densityGPerCm3 g/cm³ to sigma=$expectedSigmaKgPerM2 kg/m²',
      ({ densityGPerCm3, expectedSigmaKgPerM2 }) => {
        const actual = calculateMass({
          sepAreaM2: 1,
          concentration: 2,
          structureType: 'frame',
          concentratorDensityGPerCm3: densityGPerCm3,
        });

        expectCloseToKg(actual.concentratorMassKg, expectedSigmaKgPerM2);
      },
    );
  });

  describe('model properties', () => {
    it('scales linearly with SEP area', () => {
      const base = calculateMass(VALID_CONCENTRATOR_PARAMS);
      const doubled = calculateMass({
        ...VALID_CONCENTRATOR_PARAMS,
        sepAreaM2: VALID_CONCENTRATOR_PARAMS.sepAreaM2 * 2,
      });

      expectCloseToKg(doubled.structureMassKg, base.structureMassKg * 2);
      expectCloseToKg(doubled.concentratorMassKg, base.concentratorMassKg * 2);
      expectCloseToKg(doubled.totalMassKg, base.totalMassKg * 2);
    });

    it.each([
      {
        sepAreaM2: 10,
        concentration: 1,
        structureType: 'honeycomb' as const,
      },
      VALID_CONCENTRATOR_PARAMS,
      {
        sepAreaM2: 8.5,
        concentration: 4,
        structureType: 'frame' as const,
        concentratorDensityGPerCm3: 3.18,
      },
    ])('returns totalMassKg as the sum of parts for %j', (params) => {
      const actual = calculateMass(params);
      expectCloseToKg(
        actual.totalMassKg,
        actual.structureMassKg + actual.concentratorMassKg,
      );
    });

    it('does not scale mass directly with K when K > 1', () => {
      const shared = {
        sepAreaM2: 10,
        structureType: 'honeycomb' as const,
        concentratorDensityGPerCm3: 2.5,
      };
      const atK2 = calculateMass({ ...shared, concentration: 2 });
      const atK9 = calculateMass({ ...shared, concentration: 9 });

      expectCloseToKg(atK9.structureMassKg, atK2.structureMassKg);
      expectCloseToKg(atK9.concentratorMassKg, atK2.concentratorMassKg);
      expectCloseToKg(atK9.totalMassKg, atK2.totalMassKg);
    });
  });

  describe('architectural boundary', () => {
    it('computes honeycomb + K=9 without applying construction constraints', () => {
      const actual = calculateMass({
        sepAreaM2: 10,
        concentration: 9,
        structureType: 'honeycomb',
        concentratorDensityGPerCm3: 2.5,
      });

      expectMassResult(actual, {
        structureMassKg: 16.3,
        concentratorMassKg: 50,
        totalMassKg: 66.3,
      });
    });
  });

  describe('invalid values', () => {
    it('rejects an invalid structureType at runtime', () => {
      expect(() =>
        calculateMass({
          ...VALID_CONCENTRATOR_PARAMS,
          structureType: 'invalid' as StructureType,
        }),
      ).toThrow(MassCalculationError);
    });

    it('rejects a concentrator density when K=1', () => {
      expect(() =>
        calculateMass({
          sepAreaM2: 10,
          concentration: 1,
          structureType: 'honeycomb',
          concentratorDensityGPerCm3: 2.5,
        }),
      ).toThrow(MassCalculationError);
    });

    it.each([
      { sepAreaM2: 0 },
      { sepAreaM2: -1 },
      { concentration: 0.99 },
      { concentration: 9.01 },
      { concentratorDensityGPerCm3: undefined },
      { concentratorDensityGPerCm3: null },
      { concentratorDensityGPerCm3: 0 },
      { concentratorDensityGPerCm3: -1 },
      { sepAreaM2: Number.NaN },
      { sepAreaM2: Number.POSITIVE_INFINITY },
      { sepAreaM2: Number.NEGATIVE_INFINITY },
      { concentration: Number.NaN },
      { concentration: Number.POSITIVE_INFINITY },
      { concentration: Number.NEGATIVE_INFINITY },
      { concentratorDensityGPerCm3: Number.NaN },
      { concentratorDensityGPerCm3: Number.POSITIVE_INFINITY },
      { concentratorDensityGPerCm3: Number.NEGATIVE_INFINITY },
    ])('rejects %j', (override) => {
      expect(() =>
        calculateMass({
          ...VALID_CONCENTRATOR_PARAMS,
          ...override,
        }),
      ).toThrow(MassCalculationError);
    });
  });
});
