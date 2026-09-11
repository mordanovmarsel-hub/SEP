import type { ParetoMetric } from '@sep/core';
import {
  formatParetoCriterionLabel,
  PARETO_EXPLANATION,
  resolveParetoCriteria,
} from '../lib/pareto-copy.ts';

interface ParetoExplanationProps {
  criteria?: readonly ParetoMetric[];
}

export function ParetoExplanation({ criteria }: ParetoExplanationProps) {
  const resolved = resolveParetoCriteria(criteria);

  return (
    <section
      className="panel pareto-explanation"
      data-testid="pareto-explanation"
      aria-label="Объяснение Парето"
    >
      <h2>Парето-оптимальные решения</h2>
      <p>{PARETO_EXPLANATION}</p>
      <p className="hint">Критерии, по которым отмечается фронт:</p>
      <ul>
        {resolved.map((metric) => (
          <li key={metric}>{formatParetoCriterionLabel(metric)}</li>
        ))}
      </ul>
    </section>
  );
}
