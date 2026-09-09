import {
  ALTITUDE_ANCHORS_KM,
  AVERAGE_COSINE_TABLE,
  CONCENTRATION_ANCHORS,
  MAX_ALTITUDE_KM,
  MAX_CONCENTRATION,
  MIN_ALTITUDE_KM,
  MIN_CONCENTRATION,
} from './data';
import {
  barycentricInterpolate,
  barycentricWeights,
  findBracket,
  linearInterpolate,
} from './interpolation';

export interface AverageCosineParams {
  altitudeKm: number;
  concentration: number;
}

export class AverageCosineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AverageCosineError';
  }
}

const ALTITUDE_WEIGHTS = barycentricWeights(ALTITUDE_ANCHORS_KM);

function requireFiniteInRange(
  value: number,
  label: string,
  min: number,
  max: number,
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AverageCosineError(
      `Invalid ${label}: expected a finite number in [${min}, ${max}], received ${String(value)}`,
    );
  }

  if (value < min || value > max) {
    throw new AverageCosineError(
      `Invalid ${label}: expected a finite number in [${min}, ${max}], received ${String(value)}`,
    );
  }
}

function cosineAtAnchorConcentration(altitudeKm: number, concentrationIndex: number): number {
  const column = AVERAGE_COSINE_TABLE.map((row) => {
    const value = row[concentrationIndex];
    if (value === undefined) {
      throw new AverageCosineError(
        `Missing engineering table value for concentration index ${concentrationIndex}`,
      );
    }
    return value;
  });

  return barycentricInterpolate(
    ALTITUDE_ANCHORS_KM,
    column,
    altitudeKm,
    ALTITUDE_WEIGHTS,
  );
}

/**
 * Average cos(alpha) from the approved two-stage interpolation:
 * barycentric Lagrange over altitude, then linear interpolation over K.
 */
export function calculateAverageCosine({
  altitudeKm,
  concentration,
}: AverageCosineParams): number {
  requireFiniteInRange(altitudeKm, 'altitudeKm', MIN_ALTITUDE_KM, MAX_ALTITUDE_KM);
  requireFiniteInRange(
    concentration,
    'concentration',
    MIN_CONCENTRATION,
    MAX_CONCENTRATION,
  );

  const [leftIndex, rightIndex] = findBracket(CONCENTRATION_ANCHORS, concentration);
  const leftConcentration = CONCENTRATION_ANCHORS[leftIndex];
  const leftCosine = cosineAtAnchorConcentration(altitudeKm, leftIndex);

  if (leftIndex === rightIndex || leftConcentration === undefined) {
    return leftCosine;
  }

  const rightConcentration = CONCENTRATION_ANCHORS[rightIndex];
  if (rightConcentration === undefined) {
    throw new AverageCosineError(
      `Missing concentration anchor at index ${rightIndex}`,
    );
  }

  return linearInterpolate(
    leftConcentration,
    leftCosine,
    rightConcentration,
    cosineAtAnchorConcentration(altitudeKm, rightIndex),
    concentration,
  );
}
