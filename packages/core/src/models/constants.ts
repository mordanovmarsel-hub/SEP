/**
 * Approved v1 efficiency model. Thermal / concentration-dependent
 * efficiency is out of scope and must not change these results.
 */
export const EFFICIENCY_MODEL = 'CONSTANT' as const;
export type EfficiencyModel = typeof EFFICIENCY_MODEL;

export const MIN_ALTITUDE_KM = 400;
export const MAX_ALTITUDE_KM = 3600;

export const MIN_CONCENTRATION = 1;
export const MAX_CONCENTRATION = 9;

/** Constructive limit for honeycomb. Constraints own this rule, not mass. */
export const HONEYCOMB_MAX_CONCENTRATION = 2.3;
export const FRAME_MAX_CONCENTRATION = 9;

/** Resulting generator concentrations. K=1.4 and K=2.3 are interpolation anchors only. */
export const GENERATOR_CONCENTRATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type GeneratorConcentration = (typeof GENERATOR_CONCENTRATIONS)[number];

/** Enumeration step for S_SEP. Use integer ticks (`tick / 10`) to avoid float drift. */
export const SEP_AREA_STEP_M2 = 0.1;

/** Exclusive lower bound: 0 < efficiency <= 1. */
export const MIN_FEP_EFFICIENCY_EXCLUSIVE = 0;
export const MAX_FEP_EFFICIENCY = 1;
