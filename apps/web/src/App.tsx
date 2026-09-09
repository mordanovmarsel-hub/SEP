import { useCallback, useMemo, useState } from 'react';
import { calculateSep } from '@sep/core';
import type { SepCalculationResult } from '@sep/core';
import { CalculationForm } from './components/CalculationForm.tsx';
import { ResultsChart } from './components/ResultsChart.tsx';
import { ResultsFilters } from './components/ResultsFilters.tsx';
import { ResultsTable } from './components/ResultsTable.tsx';
import { Summary } from './components/Summary.tsx';
import { mapCalculationError } from './lib/errors.ts';
import { emptyResultsFilter, filterSolutions, type ResultsFilter } from './lib/filter.ts';
import { DEFAULT_FORM, buildCalculationInput, type CalculationFormValues } from './lib/form.ts';
import { DEFAULT_SORT, sortSolutions, type SortState } from './lib/sort.ts';
import { buildSummary } from './lib/summary.ts';
import './App.css';

type CalculationState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; result: SepCalculationResult };

export default function App() {
  const [form, setForm] = useState<CalculationFormValues>(DEFAULT_FORM);
  const [calculation, setCalculation] = useState<CalculationState>({ status: 'idle' });
  const [filter, setFilter] = useState<ResultsFilter>(emptyResultsFilter());
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const solutions = calculation.status === 'success' ? calculation.result.solutions : [];
  const filtered = useMemo(() => filterSolutions(solutions, filter), [filter, solutions]);
  const displayed = useMemo(() => sortSolutions(filtered, sort), [filtered, sort]);
  const summary = calculation.status === 'success' ? buildSummary(calculation.result) : null;

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  function handleCalculate(): void {
    try {
      const input = buildCalculationInput(form);
      const result = calculateSep(input);
      setCalculation({ status: 'success', result });
      setFilter(emptyResultsFilter());
      setSort(DEFAULT_SORT);
      setSelectedId(null);
    } catch (error) {
      setCalculation({
        status: 'error',
        message: mapCalculationError(error),
      });
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>SEP</h1>
        <p>
          Поиск всех допустимых конфигураций солнечной энергетической установки по
          мощности, массе, площади и высоте орбиты. Расчёт выполняется локально
          через <code>@sep/core</code>, справочники — <code>@sep/data</code>.
        </p>
        <p className="notice">
          Тепловая модель <code>THERMAL_CONCENTRATION</code> / <code>eta_FEP_eff</code> не
          реализована и отключена: используется постоянный КПД (режим{' '}
          <code>CONSTANT</code>) до появления дополнительных инженерных данных.
        </p>
      </header>

      <CalculationForm value={form} onChange={setForm} onSubmit={handleCalculate} />

      {calculation.status === 'error' ? (
        <p className="error" role="alert" data-testid="error-message">
          {calculation.message}
        </p>
      ) : null}

      {calculation.status === 'success' && summary ? (
        <>
          <Summary summary={summary} />

          {calculation.result.totalFeasible === 0 ? (
            <p className="empty" data-testid="empty-results" role="status">
              По заданным ограничениям допустимые конфигурации не найдены
            </p>
          ) : (
            <>
              <ResultsFilters solutions={solutions} value={filter} onChange={setFilter} />

              {displayed.length === 0 ? (
                <p className="empty" role="status">
                  Нет конфигураций, соответствующих текущим фильтрам
                </p>
              ) : (
                <>
                  <ResultsTable
                    solutions={displayed}
                    sort={sort}
                    selectedId={selectedId}
                    onSortChange={setSort}
                    onSelect={handleSelect}
                  />
                  <ResultsChart
                    solutions={displayed}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                  />
                </>
              )}
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
