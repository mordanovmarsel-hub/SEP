/**
 * Plotly may pass `customdata` as a string or as a one-element array.
 */
export function readSolutionId(customdata: unknown): string | null {
  if (typeof customdata === 'string' && customdata !== '') {
    return customdata;
  }

  if (Array.isArray(customdata)) {
    const first = customdata[0];
    if (typeof first === 'string' && first !== '') {
      return first;
    }
  }

  return null;
}
