import { describe, expect, it } from 'vitest';
import {
  AverageCosineError,
  calculateAverageCosine,
} from '../src/index';

/** Explicit 35-point fixture copied from the approved engineering table. */
const REFERENCE_ALTITUDES_KM = [400, 500, 800, 1600, 2000, 2800, 3600] as const;
const REFERENCE_CONCENTRATIONS = [1, 1.4, 2.3, 4, 9] as const;
const REFERENCE_COSINE = [
  [0.663, 0.647, 0.638, 0.6329, 0.632],
  [0.659, 0.6473, 0.6353, 0.6297, 0.6286],
  [0.7084, 0.6789, 0.6622, 0.655, 0.6538],
  [0.7729, 0.7216, 0.6985, 0.6869, 0.6842],
  [0.7453, 0.6946, 0.6728, 0.6622, 0.6608],
  [0.6592, 0.5999, 0.5737, 0.5648, 0.564],
  [0.605, 0.54, 0.52, 0.511, 0.51],
] as const;

const REGRESSION_POINTS = REFERENCE_ALTITUDES_KM.flatMap((altitudeKm, row) =>
  REFERENCE_CONCENTRATIONS.map((concentration, column) => {
    const expected = REFERENCE_COSINE[row]?.[column];
    if (expected === undefined) {
      throw new Error(`Missing fixture value at H=${altitudeKm}, K=${concentration}`);
    }
    return { altitudeKm, concentration, expected };
  }),
);

const COSINE_TOLERANCE = 1e-6;

function expectCloseToTable(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(COSINE_TOLERANCE);
}

function cosineAtAltitude1600(concentration: number): number {
  const row = REFERENCE_COSINE[3];
  const anchors = REFERENCE_CONCENTRATIONS;

  for (let index = 0; index < anchors.length; index += 1) {
    if (anchors[index] === concentration) {
      const value = row[index];
      if (value === undefined) {
        throw new Error(`Missing fixture value at K=${concentration}`);
      }
      return value;
    }
  }

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const leftK = anchors[index];
    const rightK = anchors[index + 1];
    const leftC = row[index];
    const rightC = row[index + 1];
    if (
      leftK !== undefined &&
      rightK !== undefined &&
      leftC !== undefined &&
      rightC !== undefined &&
      concentration > leftK &&
      concentration < rightK
    ) {
      return leftC + ((concentration - leftK) / (rightK - leftK)) * (rightC - leftC);
    }
  }

  throw new Error(`K=${concentration} is outside the fixture anchors`);
}

/**
 * Test-only barycentric Lagrange interpolant.
 * Duplicates the approved math so H=1200 expected is independent of production code.
 */
function independentBarycentricInterpolate(
  nodes: readonly number[],
  values: readonly number[],
  x: number,
): number {
  const weights = nodes.map((node, index) => {
    let weight = 1;
    for (let other = 0; other < nodes.length; other += 1) {
      if (other !== index) {
        const otherNode = nodes[other];
        if (otherNode === undefined) {
          throw new Error(`Missing independent node at index ${other}`);
        }
        weight /= node - otherNode;
      }
    }
    return weight;
  });

  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const value = values[index];
    const weight = weights[index];
    if (node === undefined || value === undefined || weight === undefined) {
      throw new Error(`Missing independent sample at index ${index}`);
    }
    if (x === node) {
      return value;
    }
    const term = weight / (x - node);
    numerator += term * value;
    denominator += term;
  }

  return numerator / denominator;
}

function independentAverageCosine(altitudeKm: number, concentration: number): number {
  const valuesAtAltitude = REFERENCE_CONCENTRATIONS.map((_, column) => {
    const columnValues = REFERENCE_COSINE.map((row) => {
      const value = row[column];
      if (value === undefined) {
        throw new Error(`Missing fixture column ${column}`);
      }
      return value;
    });
    return independentBarycentricInterpolate(
      REFERENCE_ALTITUDES_KM,
      columnValues,
      altitudeKm,
    );
  });

  for (let index = 0; index < REFERENCE_CONCENTRATIONS.length; index += 1) {
    if (REFERENCE_CONCENTRATIONS[index] === concentration) {
      const value = valuesAtAltitude[index];
      if (value === undefined) {
        throw new Error(`Missing independent C(H) at K=${concentration}`);
      }
      return value;
    }
  }

  for (let index = 0; index < REFERENCE_CONCENTRATIONS.length - 1; index += 1) {
    const leftK = REFERENCE_CONCENTRATIONS[index];
    const rightK = REFERENCE_CONCENTRATIONS[index + 1];
    const leftC = valuesAtAltitude[index];
    const rightC = valuesAtAltitude[index + 1];
    if (
      leftK !== undefined &&
      rightK !== undefined &&
      leftC !== undefined &&
      rightC !== undefined &&
      concentration > leftK &&
      concentration < rightK
    ) {
      return leftC + ((concentration - leftK) / (rightK - leftK)) * (rightC - leftC);
    }
  }

  throw new Error(`K=${concentration} is outside the fixture anchors`);
}

describe('calculateAverageCosine', () => {
  it.each(REGRESSION_POINTS)(
    'reproduces the engineering point H=$altitudeKm K=$concentration',
    ({ altitudeKm, concentration, expected }) => {
      if (expected === undefined) {
        throw new Error(`Missing expected cosine for H=${altitudeKm}, K=${concentration}`);
      }
      const actual = calculateAverageCosine({ altitudeKm, concentration });
      expectCloseToTable(actual, expected);
    },
  );

  describe('interpolation over K at H=1600', () => {
    it.each([
      { concentration: 2, expected: 0.7062 },
      { concentration: 3 },
      { concentration: 3.5 },
      { concentration: 5 },
      { concentration: 6 },
      { concentration: 7 },
      { concentration: 8 },
    ] as const)('computes K=$concentration from neighbouring anchors', ({
      concentration,
      ...rest
    }) => {
      const actual = calculateAverageCosine({
        altitudeKm: 1600,
        concentration,
      });
      const expected =
        'expected' in rest && rest.expected !== undefined
          ? rest.expected
          : cosineAtAltitude1600(concentration);

      expectCloseToTable(actual, expected);
      if (concentration === 2) {
        expectCloseToTable(actual, 0.7062);
      }
    });
  });

  it('interpolates an off-table altitude H=1200 at K=2 from an independent algorithm', () => {
    const expected = independentAverageCosine(1200, 2);
    const actual = calculateAverageCosine({
      altitudeKm: 1200,
      concentration: 2,
    });

    expectCloseToTable(actual, expected);
  });

  describe('boundaries', () => {
    it.each([
      { altitudeKm: 400, concentration: 1, expected: 0.663 },
      { altitudeKm: 400, concentration: 9, expected: 0.632 },
      { altitudeKm: 3600, concentration: 1, expected: 0.605 },
      { altitudeKm: 3600, concentration: 9, expected: 0.51 },
    ])(
      'accepts the inclusive bound H=$altitudeKm K=$concentration',
      ({ altitudeKm, concentration, expected }) => {
        expectCloseToTable(
          calculateAverageCosine({ altitudeKm, concentration }),
          expected,
        );
      },
    );
  });

  describe('invalid values', () => {
    it.each([
      { altitudeKm: 399, concentration: 2 },
      { altitudeKm: 3601, concentration: 2 },
      { altitudeKm: 1200, concentration: 0.99 },
      { altitudeKm: 1200, concentration: 9.01 },
      { altitudeKm: Number.NaN, concentration: 2 },
      { altitudeKm: 1200, concentration: Number.NaN },
      { altitudeKm: Number.POSITIVE_INFINITY, concentration: 2 },
      { altitudeKm: Number.NEGATIVE_INFINITY, concentration: 2 },
      { altitudeKm: 1200, concentration: Number.POSITIVE_INFINITY },
      { altitudeKm: 1200, concentration: Number.NEGATIVE_INFINITY },
    ])(
      'rejects altitudeKm=$altitudeKm concentration=$concentration',
      ({ altitudeKm, concentration }) => {
        expect(() =>
          calculateAverageCosine({ altitudeKm, concentration }),
        ).toThrow(AverageCosineError);
      },
    );
  });

  describe('result invariants', () => {
    it.each([
      { altitudeKm: 400, concentration: 1 },
      { altitudeKm: 1200, concentration: 2 },
      { altitudeKm: 1600, concentration: 3.5 },
      { altitudeKm: 2800, concentration: 7.25 },
      { altitudeKm: 3600, concentration: 9 },
    ])(
      'returns a finite value in [0, 1] for H=$altitudeKm K=$concentration',
      ({ altitudeKm, concentration }) => {
        const result = calculateAverageCosine({ altitudeKm, concentration });
        expect(Number.isFinite(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      },
    );
  });
});
