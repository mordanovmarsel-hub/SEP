/**
 * Plotly may pass `customdata` as the solution id string, a one-element
 * wrapper `[id]`, or a parsed JSON tuple that `calculateSep` stringifies.
 */
export function readSolutionId(customdata: unknown): string | null {
  if (typeof customdata === 'string' && customdata !== '') {
    return customdata;
  }

  if (!Array.isArray(customdata)) {
    return null;
  }

  if (customdata.length === 1) {
    const only = customdata[0];
    return typeof only === 'string' && only !== '' ? only : null;
  }

  if (isSolutionIdTuple(customdata)) {
    return JSON.stringify(customdata);
  }

  return null;
}

function isSolutionIdTuple(
  value: readonly unknown[],
): value is [string, string, string | null, number, number, number] {
  return (
    value.length === 6 &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'string' &&
    (value[2] === null || typeof value[2] === 'string') &&
    typeof value[3] === 'number' &&
    typeof value[4] === 'number' &&
    typeof value[5] === 'number'
  );
}
