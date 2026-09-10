import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FORM,
  FormValidationError,
  buildCalculationInput,
  createFepDraft,
  type CalculationFormValues,
} from './form.ts';

function filledForm(
  overrides: Partial<CalculationFormValues> = {},
): CalculationFormValues {
  return {
    ...DEFAULT_FORM,
    feps: [{ id: 'fep-1', name: 'ФЭП 1', efficiencyPercent: '30' }],
    ...overrides,
  };
}

describe('buildCalculationInput', () => {
  it('converts a user-entered efficiency percent to a core fraction', () => {
    const input = buildCalculationInput(filledForm());
    expect(input.photovoltaicCells).toEqual([
      { id: 'fep-1', name: 'ФЭП 1', efficiency: 0.3 },
    ]);
  });

  it('keeps selected approved materials and both structures', () => {
    const input = buildCalculationInput(filledForm());
    expect(input.structures).toEqual(['honeycomb', 'frame']);
    expect(input.concentratorMaterials.map((material) => material.id)).toEqual([
      'caf2',
      'mgf2',
      'bk7',
      'synthetic-uv-glass',
      'quartz-glass',
    ]);
  });

  it('rejects altitude outside 400–3600 without calling core', () => {
    expect(() =>
      buildCalculationInput(filledForm({ altitudeKm: '100' })),
    ).toThrow(FormValidationError);
    expect(() =>
      buildCalculationInput(filledForm({ altitudeKm: '100' })),
    ).toThrow(/400 до 3600/);
  });

  it('rejects empty FEP name and out-of-range percent', () => {
    expect(() =>
      buildCalculationInput(
        filledForm({
          feps: [{ id: 'fep-1', name: '   ', efficiencyPercent: '30' }],
        }),
      ),
    ).toThrow(/Название ФЭП/);

    expect(() =>
      buildCalculationInput(
        filledForm({
          feps: [{ id: 'fep-1', name: 'ФЭП 1', efficiencyPercent: '0' }],
        }),
      ),
    ).toThrow(/процентах/);
  });

  it('rejects empty FEP efficiency until the user enters a value', () => {
    expect(DEFAULT_FORM.feps[0]?.efficiencyPercent).toBe('');
    expect(() => buildCalculationInput(DEFAULT_FORM)).toThrow(FormValidationError);
    expect(() => buildCalculationInput(DEFAULT_FORM)).toThrow(/КПД «ФЭП 1».*укажите число/);
  });

  it('allows an empty material list so K=1 remains possible', () => {
    const input = buildCalculationInput(filledForm({ selectedMaterialIds: [] }));
    expect(input.concentratorMaterials).toEqual([]);
  });

  it('allocates unique editable FEP ids without a preset efficiency', () => {
    const first = createFepDraft([]);
    const second = createFepDraft([first]);
    expect(first.id).toBe('fep-1');
    expect(second.id).toBe('fep-2');
    expect(second.name).toBe('ФЭП 2');
    expect(first.efficiencyPercent).toBe('');
    expect(second.efficiencyPercent).toBe('');
  });
});
