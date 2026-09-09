import { describe, expect, it } from 'vitest';
import {
  CONSTRAINT_VIOLATION_ORDER,
  evaluateConstraints,
  isStructurallyFeasible,
  maxConcentrationForStructure,
} from '../src/index';
import type { ConstraintParams, ConstraintViolation } from '../src/index';

const FEASIBLE_PARAMS: ConstraintParams = {
  averagePowerW: 2500,
  requiredPowerW: 2500,
  totalMassKg: 10,
  maxMassKg: 10,
  sepAreaM2: 2,
  maxSepAreaM2: 2,
  altitudeKm: 1200,
  concentration: 2,
  structureType: 'honeycomb',
};

function evaluate(overrides: Partial<ConstraintParams> = {}) {
  return evaluateConstraints({ ...FEASIBLE_PARAMS, ...overrides });
}

describe('maxConcentrationForStructure', () => {
  it('returns the constructive honeycomb ceiling 2.3', () => {
    expect(maxConcentrationForStructure('honeycomb')).toBe(2.3);
  });

  it('returns the constructive frame ceiling 9', () => {
    expect(maxConcentrationForStructure('frame')).toBe(9);
  });
});

describe('isStructurallyFeasible', () => {
  it('accepts honeycomb K=1, K=2 and K=2.3', () => {
    expect(isStructurallyFeasible('honeycomb', 1)).toBe(true);
    expect(isStructurallyFeasible('honeycomb', 2)).toBe(true);
    expect(isStructurallyFeasible('honeycomb', 2.3)).toBe(true);
  });

  it('rejects honeycomb K above 2.3', () => {
    expect(isStructurallyFeasible('honeycomb', 2.3000001)).toBe(false);
    expect(isStructurallyFeasible('honeycomb', 3)).toBe(false);
    expect(isStructurallyFeasible('honeycomb', 9)).toBe(false);
  });

  it('accepts frame K=9 and rejects K above 9', () => {
    expect(isStructurallyFeasible('frame', 1)).toBe(true);
    expect(isStructurallyFeasible('frame', 9)).toBe(true);
    expect(isStructurallyFeasible('frame', 9.0000001)).toBe(false);
  });
});

describe('evaluateConstraints', () => {
  describe('power', () => {
    it('accepts power equal to required and reports a zero margin', () => {
      const actual = evaluate({
        averagePowerW: 2500,
        requiredPowerW: 2500,
      });

      expect(actual.isFeasible).toBe(true);
      expect(actual.violations).toEqual([]);
      expect(actual.powerMarginW).toBe(0);
    });

    it('rejects power just below required and reports a negative margin', () => {
      const actual = evaluate({
        averagePowerW: 2499.999,
        requiredPowerW: 2500,
      });

      expect(actual.isFeasible).toBe(false);
      expect(actual.violations).toEqual<ConstraintViolation[]>(['power']);
      expect(actual.powerMarginW).toBeCloseTo(-0.001, 12);
    });

    it('accepts power above required and reports a positive margin', () => {
      const actual = evaluate({
        averagePowerW: 2600,
        requiredPowerW: 2500,
      });

      expect(actual.isFeasible).toBe(true);
      expect(actual.violations).toEqual([]);
      expect(actual.powerMarginW).toBe(100);
    });
  });

  describe('mass', () => {
    it('accepts mass equal to the maximum and reports a zero margin', () => {
      const actual = evaluate({
        totalMassKg: 10,
        maxMassKg: 10,
      });

      expect(actual.isFeasible).toBe(true);
      expect(actual.violations).toEqual([]);
      expect(actual.massMarginKg).toBe(0);
    });

    it('rejects mass just above the maximum and reports a negative margin', () => {
      const actual = evaluate({
        totalMassKg: 10.001,
        maxMassKg: 10,
      });

      expect(actual.isFeasible).toBe(false);
      expect(actual.violations).toEqual<ConstraintViolation[]>(['mass']);
      expect(actual.massMarginKg).toBeCloseTo(-0.001, 12);
    });

    it('accepts mass below the maximum and reports a positive margin', () => {
      const actual = evaluate({
        totalMassKg: 7.5,
        maxMassKg: 10,
      });

      expect(actual.isFeasible).toBe(true);
      expect(actual.massMarginKg).toBe(2.5);
    });
  });

  describe('area', () => {
    it('accepts S_SEP equal to S_max and reports a zero margin', () => {
      const actual = evaluate({
        sepAreaM2: 2,
        maxSepAreaM2: 2,
      });

      expect(actual.isFeasible).toBe(true);
      expect(actual.violations).toEqual([]);
      expect(actual.areaMarginM2).toBe(0);
    });

    it('rejects S_SEP just above S_max and reports a negative margin', () => {
      const actual = evaluate({
        sepAreaM2: 2.001,
        maxSepAreaM2: 2,
      });

      expect(actual.isFeasible).toBe(false);
      expect(actual.violations).toEqual<ConstraintViolation[]>(['area']);
      expect(actual.areaMarginM2).toBeCloseTo(-0.001, 12);
    });

    it('accepts S_SEP below S_max and reports a positive margin', () => {
      const actual = evaluate({
        sepAreaM2: 1.4,
        maxSepAreaM2: 2,
      });

      expect(actual.isFeasible).toBe(true);
      expect(actual.areaMarginM2).toBeCloseTo(0.6, 12);
    });
  });

  describe('altitude', () => {
    it('accepts the H=400 and H=3600 boundaries', () => {
      expect(evaluate({ altitudeKm: 400 }).isFeasible).toBe(true);
      expect(evaluate({ altitudeKm: 3600 }).isFeasible).toBe(true);
      expect(evaluate({ altitudeKm: 400 }).violations).toEqual([]);
      expect(evaluate({ altitudeKm: 3600 }).violations).toEqual([]);
    });

    it('rejects H below 400 and above 3600', () => {
      expect(evaluate({ altitudeKm: 399.999 }).violations).toEqual<ConstraintViolation[]>([
        'altitude',
      ]);
      expect(evaluate({ altitudeKm: 3600.001 }).violations).toEqual<ConstraintViolation[]>([
        'altitude',
      ]);
      expect(evaluate({ altitudeKm: 399 }).isFeasible).toBe(false);
      expect(evaluate({ altitudeKm: 3601 }).isFeasible).toBe(false);
    });
  });

  describe('concentration', () => {
    it('accepts the generic K=1 and K=9 boundaries', () => {
      expect(
        evaluate({ concentration: 1, structureType: 'frame' }).isFeasible,
      ).toBe(true);
      expect(
        evaluate({ concentration: 9, structureType: 'frame' }).isFeasible,
      ).toBe(true);
    });

    it('rejects K below 1 and above 9', () => {
      expect(
        evaluate({ concentration: 0.999, structureType: 'frame' }).violations,
      ).toEqual<ConstraintViolation[]>(['concentration']);
      expect(
        evaluate({ concentration: 9.001, structureType: 'frame' }).violations,
      ).toEqual<ConstraintViolation[]>(['concentration', 'structure-concentration']);
    });
  });

  describe('structure-concentration', () => {
    it('accepts honeycomb K=1, K=2 and K=2.3 in the generic API', () => {
      expect(evaluate({ concentration: 1, structureType: 'honeycomb' }).isFeasible).toBe(
        true,
      );
      expect(evaluate({ concentration: 2, structureType: 'honeycomb' }).isFeasible).toBe(
        true,
      );
      expect(evaluate({ concentration: 2.3, structureType: 'honeycomb' }).isFeasible).toBe(
        true,
      );
    });

    it('rejects honeycomb K above 2.3 as structure-concentration only', () => {
      const actual = evaluate({
        concentration: 3,
        structureType: 'honeycomb',
      });

      expect(actual.isFeasible).toBe(false);
      expect(actual.violations).toEqual<ConstraintViolation[]>(['structure-concentration']);
    });

    it('accepts frame K=9', () => {
      const actual = evaluate({
        concentration: 9,
        structureType: 'frame',
      });

      expect(actual.isFeasible).toBe(true);
      expect(actual.violations).toEqual([]);
    });
  });

  describe('multiple violations', () => {
    it('lists every violation in CONSTRAINT_VIOLATION_ORDER', () => {
      const actual = evaluate({
        averagePowerW: 100,
        requiredPowerW: 200,
        totalMassKg: 12,
        maxMassKg: 10,
        sepAreaM2: 3,
        maxSepAreaM2: 2,
        altitudeKm: 399,
        concentration: 10,
        structureType: 'honeycomb',
      });

      expect(actual.isFeasible).toBe(false);
      expect(actual.violations).toEqual<ConstraintViolation[]>([
        'power',
        'mass',
        'area',
        'altitude',
        'concentration',
        'structure-concentration',
      ]);
      expect(actual.violations).toEqual([...CONSTRAINT_VIOLATION_ORDER]);
    });

    it('keeps a subset of violations in the same canonical order', () => {
      const actual = evaluate({
        averagePowerW: 100,
        requiredPowerW: 200,
        sepAreaM2: 3,
        maxSepAreaM2: 2,
        concentration: 3,
        structureType: 'honeycomb',
      });

      expect(actual.violations).toEqual<ConstraintViolation[]>([
        'power',
        'area',
        'structure-concentration',
      ]);
    });
  });

  describe('margins', () => {
    it('computes signed power, mass and area margins from the specified formulas', () => {
      const surplus = evaluate({
        averagePowerW: 2600,
        requiredPowerW: 2500,
        totalMassKg: 4,
        maxMassKg: 10,
        sepAreaM2: 1.25,
        maxSepAreaM2: 2,
      });

      expect(surplus.powerMarginW).toBe(100);
      expect(surplus.massMarginKg).toBe(6);
      expect(surplus.areaMarginM2).toBe(0.75);

      const deficit = evaluate({
        averagePowerW: 2400,
        requiredPowerW: 2500,
        totalMassKg: 13,
        maxMassKg: 10,
        sepAreaM2: 2.5,
        maxSepAreaM2: 2,
      });

      expect(deficit.powerMarginW).toBe(-100);
      expect(deficit.massMarginKg).toBe(-3);
      expect(deficit.areaMarginM2).toBe(-0.5);
    });
  });
});
