/**
 * Domain-specific failure of the top-level SEP calculation API.
 * Thrown for invalid input; never used to clamp or silently correct values.
 */
export class SepCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SepCalculationError';
  }
}
