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
export type {
  MassParams,
  MassResult,
  StructureType,
} from './mass';

export function coreHealthcheck(): string {
  return 'ok';
}
