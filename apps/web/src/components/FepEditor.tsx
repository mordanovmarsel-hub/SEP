import { createFepDraft, type FepDraft } from '../lib/form.ts';

interface FepEditorProps {
  feps: readonly FepDraft[];
  onChange: (feps: readonly FepDraft[]) => void;
}

export function FepEditor({ feps, onChange }: FepEditorProps) {
  function updateFep(id: string, patch: Partial<FepDraft>): void {
    onChange(
      feps.map((fep) => (fep.id === id ? { ...fep, ...patch } : fep)),
    );
  }

  function removeFep(id: string): void {
    onChange(feps.filter((fep) => fep.id !== id));
  }

  function addFep(): void {
    onChange([...feps, createFepDraft(feps)]);
  }

  return (
    <fieldset className="panel">
      <legend>ФЭП</legend>
      <p className="hint">
        Каталога готовых элементов нет — задайте название и КПД самостоятельно.
        КПД вводится в процентах (например 30 → в расчёт уходит 0.30).
      </p>
      <ul className="fep-list">
        {feps.map((fep, index) => (
          <li key={fep.id} className="fep-row">
            <label>
              Название
              <input
                type="text"
                name={`fep-name-${fep.id}`}
                value={fep.name}
                onChange={(event) => updateFep(fep.id, { name: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              КПД, %
              <input
                type="number"
                name={`fep-efficiency-${fep.id}`}
                min={0}
                max={100}
                step="any"
                value={fep.efficiencyPercent}
                onChange={(event) =>
                  updateFep(fep.id, { efficiencyPercent: event.target.value })
                }
              />
            </label>
            <button
              type="button"
              className="button-secondary"
              onClick={() => removeFep(fep.id)}
              aria-label={`Удалить ${fep.name || `ФЭП ${String(index + 1)}`}`}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="button-secondary" onClick={addFep}>
        Добавить ФЭП
      </button>
    </fieldset>
  );
}
