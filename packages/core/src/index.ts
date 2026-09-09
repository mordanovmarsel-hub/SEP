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

export function coreHealthcheck(): string {
  return 'ok';
}
