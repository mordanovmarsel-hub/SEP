import {
  MAX_ALTITUDE_KM,
  MAX_CONCENTRATION,
  MIN_ALTITUDE_KM,
  MIN_CONCENTRATION,
  type StructureType,
} from '../models';
import {
  CONSTRAINT_VIOLATION_ORDER,
  STRUCTURE_MAX_CONCENTRATION,
  type ConstraintEvaluation,
  type ConstraintParams,
  type ConstraintViolation,
} from './types';

/**
 * Constructive K ceiling for a bearing structure.
 * Honeycomb: 2.3; frame: 9.
 */
export function maxConcentrationForStructure(structureType: StructureType): number {
  return STRUCTURE_MAX_CONCENTRATION[structureType];
}

/**
 * Whether `concentration` is within the constructive K limit of `structureType`.
 * Honeycomb accepts K = 2.3; the generator still enumerates only integer K.
 */
export function isStructurallyFeasible(
  structureType: StructureType,
  concentration: number,
): boolean {
  return concentration <= maxConcentrationForStructure(structureType);
}

/**
 * Evaluates engineering limits for one already-computed configuration.
 * Equality at a power / mass / area / H / K boundary is feasible.
 * `violations` follow `CONSTRAINT_VIOLATION_ORDER`.
 */
export function evaluateConstraints(params: ConstraintParams): ConstraintEvaluation {
  const powerMarginW = params.averagePowerW - params.requiredPowerW;
  const massMarginKg = params.maxMassKg - params.totalMassKg;
  const areaMarginM2 = params.maxSepAreaM2 - params.sepAreaM2;

  const detected = new Set<ConstraintViolation>();

  if (!(params.averagePowerW >= params.requiredPowerW)) {
    detected.add('power');
  }

  if (!(params.totalMassKg <= params.maxMassKg)) {
    detected.add('mass');
  }

  if (!(params.sepAreaM2 <= params.maxSepAreaM2)) {
    detected.add('area');
  }

  if (!(params.altitudeKm >= MIN_ALTITUDE_KM && params.altitudeKm <= MAX_ALTITUDE_KM)) {
    detected.add('altitude');
  }

  if (
    !(params.concentration >= MIN_CONCENTRATION && params.concentration <= MAX_CONCENTRATION)
  ) {
    detected.add('concentration');
  }

  if (!isStructurallyFeasible(params.structureType, params.concentration)) {
    detected.add('structure-concentration');
  }

  const violations = CONSTRAINT_VIOLATION_ORDER.filter((violation) =>
    detected.has(violation),
  );

  return {
    isFeasible: violations.length === 0,
    violations,
    powerMarginW,
    massMarginKg,
    areaMarginM2,
  };
}
