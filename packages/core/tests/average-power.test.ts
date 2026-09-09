import { describe, expect, it } from 'vitest';
import {
  AveragePowerError,
  calculateAveragePower,
} from '../src/index';
import type { AveragePowerParams } from '../src/index';

const POWER_TOLERANCE_W = 1e-9;

const VALID_PARAMS: AveragePowerParams = {
  sepAreaM2: 10,
  fepEfficiency: 0.3,
  concentration: 2,
  averageCosine: 0.7,
};

function expectCloseToWatts(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(POWER_TOLERANCE_W);
}

describe('calculateAveragePower', () => {
  describe('regression', () => {
    it('computes P_avg for K=1 with eta_opt=1', () => {
      const actual = calculateAveragePower({
        sepAreaM2: 10,
        fepEfficiency: 0.3,
        concentration: 1,
        averageCosine: 0.7,
      });

      expectCloseToWatts(actual, 2858.1);
    });

    it('applies concentrator optical losses for K=2', () => {
      const actual = calculateAveragePower({
        sepAreaM2: 10,
        fepEfficiency: 0.3,
        concentration: 2,
        averageCosine: 0.7,
      });

      expectCloseToWatts(actual, 2829.519);
    });

    it('reproduces the fixed K=4 regression fixture', () => {
      const actual = calculateAveragePower({
        sepAreaM2: 8.5,
        fepEfficiency: 0.295,
        concentration: 4,
        averageCosine: 0.68,
      });

      expectCloseToWatts(actual, 2297.434689);
    });

    it('matches the specification form through S_FEP * K = S_SEP', () => {
      const sepAreaM2 = 8.5;
      const fepEfficiency = 0.295;
      const concentration = 4;
      const averageCosine = 0.68;
      const etaOpt = 0.99;
      const fepAreaM2 = sepAreaM2 / concentration;

      const fromFepArea =
        1361 * fepAreaM2 * concentration * fepEfficiency * etaOpt * averageCosine;
      const actual = calculateAveragePower({
        sepAreaM2,
        fepEfficiency,
        concentration,
        averageCosine,
      });

      expectCloseToWatts(actual, fromFepArea);
      expectCloseToWatts(actual, 2297.434689);
    });
  });

  describe('formula properties', () => {
    it('scales linearly with SEP area', () => {
      const base = calculateAveragePower(VALID_PARAMS);
      const doubled = calculateAveragePower({
        ...VALID_PARAMS,
        sepAreaM2: VALID_PARAMS.sepAreaM2 * 2,
      });

      expectCloseToWatts(doubled, base * 2);
    });

    it('scales linearly with FEP efficiency', () => {
      const base = calculateAveragePower(VALID_PARAMS);
      const doubled = calculateAveragePower({
        ...VALID_PARAMS,
        fepEfficiency: VALID_PARAMS.fepEfficiency * 2,
      });

      expectCloseToWatts(doubled, base * 2);
    });

    it('lets K change power only through eta_opt when S_SEP is fixed', () => {
      const shared = {
        sepAreaM2: 10,
        fepEfficiency: 0.3,
        averageCosine: 0.7,
      };
      const withoutConcentrator = calculateAveragePower({
        ...shared,
        concentration: 1,
      });
      const withConcentrator = calculateAveragePower({
        ...shared,
        concentration: 2,
      });
      const highConcentration = calculateAveragePower({
        ...shared,
        concentration: 9,
      });

      expectCloseToWatts(withConcentrator, withoutConcentrator * 0.99);
      expectCloseToWatts(highConcentration, withConcentrator);
    });
  });

  describe('boundaries', () => {
    it('accepts fepEfficiency=1', () => {
      const actual = calculateAveragePower({
        ...VALID_PARAMS,
        fepEfficiency: 1,
      });

      expect(Number.isFinite(actual)).toBe(true);
      expect(actual).toBeGreaterThan(0);
    });

    it.each([1, 9])('accepts concentration=%s', (concentration) => {
      const actual = calculateAveragePower({
        ...VALID_PARAMS,
        concentration,
      });

      expect(Number.isFinite(actual)).toBe(true);
      expect(actual).toBeGreaterThan(0);
    });

    it('returns 0 W when averageCosine=0', () => {
      const actual = calculateAveragePower({
        ...VALID_PARAMS,
        averageCosine: 0,
      });

      expectCloseToWatts(actual, 0);
    });

    it('accepts averageCosine=1', () => {
      const actual = calculateAveragePower({
        ...VALID_PARAMS,
        averageCosine: 1,
      });

      expect(Number.isFinite(actual)).toBe(true);
      expect(actual).toBeGreaterThan(0);
    });
  });

  describe('invalid values', () => {
    it.each([
      { sepAreaM2: 0 },
      { sepAreaM2: -1 },
      { fepEfficiency: 0 },
      { fepEfficiency: -0.1 },
      { fepEfficiency: 1.01 },
      { concentration: 0.99 },
      { concentration: 9.01 },
      { averageCosine: -0.01 },
      { averageCosine: 1.01 },
      { sepAreaM2: Number.NaN },
      { sepAreaM2: Number.POSITIVE_INFINITY },
      { sepAreaM2: Number.NEGATIVE_INFINITY },
      { fepEfficiency: Number.NaN },
      { fepEfficiency: Number.POSITIVE_INFINITY },
      { fepEfficiency: Number.NEGATIVE_INFINITY },
      { concentration: Number.NaN },
      { concentration: Number.POSITIVE_INFINITY },
      { concentration: Number.NEGATIVE_INFINITY },
      { averageCosine: Number.NaN },
      { averageCosine: Number.POSITIVE_INFINITY },
      { averageCosine: Number.NEGATIVE_INFINITY },
    ])('rejects %j', (override) => {
      expect(() =>
        calculateAveragePower({
          ...VALID_PARAMS,
          ...override,
        }),
      ).toThrow(AveragePowerError);
    });
  });
});
