/** Anchor altitudes (km) for the approved engineering table. */
export const ALTITUDE_ANCHORS_KM = Object.freeze([
  400, 500, 800, 1600, 2000, 2800, 3600,
] as const);

/** Anchor concentration values used only for cos(alpha) interpolation. */
export const CONCENTRATION_ANCHORS = Object.freeze([1, 1.4, 2.3, 4, 9] as const);

/**
 * Approved 35-point engineering table of average cos(alpha).
 * Rows follow {@link ALTITUDE_ANCHORS_KM}, columns follow {@link CONCENTRATION_ANCHORS}.
 */
export const AVERAGE_COSINE_TABLE = Object.freeze([
  //                 K=1      K=1.4    K=2.3    K=4      K=9
  Object.freeze([0.6630, 0.6470, 0.6380, 0.6329, 0.6320] as const),
  Object.freeze([0.6590, 0.6473, 0.6353, 0.6297, 0.6286] as const),
  Object.freeze([0.7084, 0.6789, 0.6622, 0.6550, 0.6538] as const),
  Object.freeze([0.7729, 0.7216, 0.6985, 0.6869, 0.6842] as const),
  Object.freeze([0.7453, 0.6946, 0.6728, 0.6622, 0.6608] as const),
  Object.freeze([0.6592, 0.5999, 0.5737, 0.5648, 0.5640] as const),
  Object.freeze([0.6050, 0.5400, 0.5200, 0.5110, 0.5100] as const),
] as const);

export const MIN_ALTITUDE_KM = 400;
export const MAX_ALTITUDE_KM = 3600;
export const MIN_CONCENTRATION = 1;
export const MAX_CONCENTRATION = 9;
