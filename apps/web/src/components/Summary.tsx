import type { CalculationSummary } from '../lib/summary.ts';
import { formatAreaM2, formatMassKg, formatWPerKg } from '../lib/format.ts';

interface SummaryProps {
  summary: CalculationSummary;
}

export function Summary({ summary }: SummaryProps) {
  return (
    <section className="panel summary" data-testid="summary" aria-label="Сводка расчёта">
      <h2>Сводка</h2>
      <dl className="summary-grid">
        <div>
          <dt>Проверено конфигураций</dt>
          <dd>{summary.totalGenerated}</dd>
        </div>
        <div>
          <dt>Допустимых решений</dt>
          <dd>{summary.totalFeasible}</dd>
        </div>
        <div>
          <dt>Парето-решений</dt>
          <dd>{summary.paretoCount}</dd>
        </div>
        {summary.minMassKg !== undefined ? (
          <div>
            <dt>Минимальная масса</dt>
            <dd>{formatMassKg(summary.minMassKg)} кг</dd>
          </div>
        ) : null}
        {summary.maxWPerKg !== undefined ? (
          <div>
            <dt>Максимальный Вт/кг</dt>
            <dd>{formatWPerKg(summary.maxWPerKg)}</dd>
          </div>
        ) : null}
        {summary.minFepAreaM2 !== undefined ? (
          <div>
            <dt>Минимальная площадь ФЭП</dt>
            <dd>{formatAreaM2(summary.minFepAreaM2)} м²</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
