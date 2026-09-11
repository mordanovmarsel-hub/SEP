import { useRef, useState } from 'react';
import { applyCsvImport } from '../lib/csv.ts';
import { createFepDraft, type FepDraft } from '../lib/form.ts';

interface FepEditorProps {
  feps: readonly FepDraft[];
  onChange: (feps: readonly FepDraft[]) => void;
}

export function FepEditor({ feps, onChange }: FepEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  async function handleCsvFile(file: File): Promise<void> {
    const text = await file.text();
    const result = applyCsvImport(feps, file.name, text);
    if (result.error !== null) {
      setImportError(result.error);
      setImportStatus(null);
      return;
    }

    onChange(result.feps);
    setImportError(null);
    setImportStatus(result.status);
  }

  return (
    <fieldset className="panel">
      <legend>ФЭП</legend>
      <p className="hint">
        Каталога готовых элементов нет — задайте название и КПД самостоятельно
        или загрузите локальный CSV. КПД вводится в процентах (например 30 → в
        расчёт уходит 0.30).
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
      <div className="fep-actions">
        <button type="button" className="button-secondary" onClick={addFep}>
          Добавить ФЭП
        </button>
        <button
          type="button"
          className="button-secondary"
          data-testid="import-csv-button"
          onClick={() => fileInputRef.current?.click()}
        >
          Загрузить CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          aria-label="Файл CSV с ФЭП"
          data-testid="import-csv-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file !== undefined) {
              void handleCsvFile(file);
            }
          }}
        />
      </div>
      <p className="hint fep-import-hint">
        Ожидаемые колонки: <code>name,efficiencyPercent</code> или русские
        заголовки «Название» / «ФЭП» и «КПД» / «КПД %». Разделитель — запятая.
        XLS/XLSX не поддерживаются. Файл обрабатывается только в браузере.
      </p>
      {importError !== null ? (
        <p className="error" role="alert" data-testid="csv-import-error">
          {importError}
        </p>
      ) : null}
      {importStatus !== null ? (
        <p className="import-status" role="status" data-testid="csv-import-status">
          {importStatus}
        </p>
      ) : null}
    </fieldset>
  );
}
