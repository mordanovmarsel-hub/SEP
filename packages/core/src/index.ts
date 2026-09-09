export {
  AverageCosineError,
  calculateAverageCosine,
} from './cosine';
export type { AverageCosineParams } from './cosine';

export function coreHealthcheck(): string {
  return 'ok';
}
