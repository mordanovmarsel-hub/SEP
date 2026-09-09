import type { ConcentratorMaterial } from '@sep/core';

/**
 * Approved concentrator materials from specification §8.2.
 * Densities are the only physical values stored here; thickness and
 * sigma_concentrator stay in the @sep/core mass module.
 *
 * IDs are stable machine keys from Issue #12.
 */
export const CONCENTRATOR_MATERIALS = [
  { id: 'caf2', name: 'CaF2', densityGPerCm3: 3.18 },
  { id: 'mgf2', name: 'MgF2', densityGPerCm3: 3.177 },
  { id: 'bk7', name: 'BK7', densityGPerCm3: 2.5 },
  {
    id: 'synthetic-uv-glass',
    name: 'Синтетическое стекло UV',
    densityGPerCm3: 2.202,
  },
  {
    id: 'quartz-glass',
    name: 'Кварцевое стекло',
    densityGPerCm3: 2.649,
  },
] as const satisfies readonly ConcentratorMaterial[];

export type ApprovedConcentratorMaterialId =
  (typeof CONCENTRATOR_MATERIALS)[number]['id'];

export const CONCENTRATOR_MATERIALS_BY_ID = Object.fromEntries(
  CONCENTRATOR_MATERIALS.map((material) => [material.id, material]),
) as {
  readonly [Id in ApprovedConcentratorMaterialId]: Extract<
    (typeof CONCENTRATOR_MATERIALS)[number],
    { id: Id }
  >;
};
