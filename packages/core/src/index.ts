export {
  AverageCosineError,
  calculateAverageCosine,
} from './cosine';
export type { AverageCosineParams } from './cosine';

export {
  AveragePowerError,
  calculateAveragePower,
} from './power';
export type { AveragePowerParams } from './power';

export {
  MassCalculationError,
  calculateMass,
} from './mass';
export type { MassParams, MassResult } from './mass';

export {
  DEFAULT_PARETO_CRITERIA,
  EFFICIENCY_MODEL,
  FRAME_MAX_CONCENTRATION,
  GENERATOR_CONCENTRATIONS,
  HONEYCOMB_MAX_CONCENTRATION,
  MAX_ALTITUDE_KM,
  MAX_CONCENTRATION,
  MAX_FEP_EFFICIENCY,
  MIN_ALTITUDE_KM,
  MIN_CONCENTRATION,
  MIN_FEP_EFFICIENCY_EXCLUSIVE,
  PARETO_METRIC_SENSE,
  SEP_AREA_STEP_M2,
  SepCalculationError,
  validateSepCalculationInput,
} from './models';
export type {
  CalculateSep,
  ConcentratorMaterial,
  EfficiencyModel,
  GeneratorConcentration,
  ParetoMetric,
  ParetoSense,
  PhotovoltaicCell,
  SepCalculationInput,
  SepCalculationResult,
  SepSolution,
  StructureType,
  ValidateSepCalculationInput,
} from './models';

export {
  CONSTRAINT_VIOLATION_ORDER,
  STRUCTURE_MAX_CONCENTRATION,
  evaluateConstraints,
  isStructurallyFeasible,
  maxConcentrationForStructure,
} from './constraints';
export type {
  ConstraintEvaluation,
  ConstraintParams,
  ConstraintViolation,
  ConstraintsApi,
  EvaluateConstraints,
  IsStructurallyFeasible,
  MaxConcentrationForStructure,
} from './constraints';

export type { MarkParetoSolutions } from './pareto';

export function coreHealthcheck(): string {
  return 'ok';
}
