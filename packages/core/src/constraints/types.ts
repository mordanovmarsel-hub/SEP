import {
  FRAME_MAX_CONCENTRATION,
  HONEYCOMB_MAX_CONCENTRATION,
  type StructureType,
} from '../models';

export type ConstraintViolation =
  | 'power'
  | 'mass'
  | 'area'
  | 'altitude'
  | 'concentration'
  | 'structure-concentration';

/**
 * Deterministic order for `ConstraintEvaluation.violations`.
 * Workstream A must emit violations in this sequence.
 */
export const CONSTRAINT_VIOLATION_ORDER = [
  'power',
  'mass',
  'area',
  'altitude',
  'concentration',
  'structure-concentration',
] as const satisfies readonly ConstraintViolation[];

/**
 * Constructive K ceilings. Mass must not consult this table.
 * Honeycomb K=2.3 is valid for the generic constraints API;
 * the generator still enumerates only integer K.
 */
export const STRUCTURE_MAX_CONCENTRATION = {
  honeycomb: HONEYCOMB_MAX_CONCENTRATION,
  frame: FRAME_MAX_CONCENTRATION,
} as const satisfies Record<StructureType, number>;

/**
 * Values already computed by cosine / power / mass / generator.
 * `maxSepAreaM2` is `maxPanelAreaM2 * panelCount`.
 */
export interface ConstraintParams {
  averagePowerW: number;
  requiredPowerW: number;
  totalMassKg: number;
  maxMassKg: number;
  sepAreaM2: number;
  maxSepAreaM2: number;
  altitudeKm: number;
  concentration: number;
  structureType: StructureType;
}

/**
 * Equality at a limit is feasible:
 * P_avg === P_required, M_total === M_max, S_SEP === S_max.
 *
 * Margins:
 * - powerMarginW = P_avg - P_required
 * - massMarginKg = M_max - M_total
 * - areaMarginM2 = S_max - S_SEP
 */
export interface ConstraintEvaluation {
  isFeasible: boolean;
  violations: ConstraintViolation[];
  powerMarginW: number;
  massMarginKg: number;
  areaMarginM2: number;
}

/** Canonical name: `evaluateConstraints`. */
export type EvaluateConstraints = (params: ConstraintParams) => ConstraintEvaluation;

/** Canonical name: `isStructurallyFeasible`. Honeycomb accepts K <= 2.3. */
export type IsStructurallyFeasible = (
  structureType: StructureType,
  concentration: number,
) => boolean;

/** Canonical name: `maxConcentrationForStructure`. */
export type MaxConcentrationForStructure = (
  structureType: StructureType,
) => number;

/**
 * Constraints API that workstream A must implement.
 * Functions stay in `@sep/core` and must not depend on UI or `@sep/data`.
 */
export interface ConstraintsApi {
  evaluateConstraints: EvaluateConstraints;
  isStructurallyFeasible: IsStructurallyFeasible;
  maxConcentrationForStructure: MaxConcentrationForStructure;
}
