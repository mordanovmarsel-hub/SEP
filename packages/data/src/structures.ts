import type { StructureType } from '@sep/core';

/**
 * Presentation labels for constructions. Not a second physics source:
 * sigma_structure and K limits stay in @sep/core.
 */
export interface StructurePresentation {
  type: StructureType;
  label: string;
}

export const STRUCTURES = [
  { type: 'honeycomb', label: 'Сотопанель' },
  { type: 'frame', label: 'Каркас' },
] as const satisfies readonly StructurePresentation[];

export const STRUCTURE_LABELS = {
  honeycomb: 'Сотопанель',
  frame: 'Каркас',
} as const satisfies Record<StructureType, string>;
