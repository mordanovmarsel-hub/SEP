/**
 * Barycentric weights for the first form of Lagrange interpolation.
 * w_i = 1 / Π_{m≠i} (x_i - x_m)
 */
export function barycentricWeights(nodes: readonly number[]): number[] {
  return nodes.map((node, index) => {
    let weight = 1;
    for (let other = 0; other < nodes.length; other += 1) {
      if (other === index) {
        continue;
      }
      const otherNode = nodes[other];
      if (otherNode === undefined) {
        throw new Error(`Missing interpolation node at index ${other}`);
      }
      weight /= node - otherNode;
    }
    return weight;
  });
}

/**
 * Evaluate the Lagrange interpolant at `x` using the barycentric formula.
 * If `x` coincides with a node, the corresponding tabulated value is returned.
 */
export function barycentricInterpolate(
  nodes: readonly number[],
  values: readonly number[],
  x: number,
  weights: readonly number[],
): number {
  if (nodes.length !== values.length || nodes.length !== weights.length) {
    throw new Error('Interpolation nodes, values, and weights must have the same length');
  }

  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const value = values[index];
    const weight = weights[index];
    if (node === undefined || value === undefined || weight === undefined) {
      throw new Error(`Missing interpolation sample at index ${index}`);
    }

    if (x === node) {
      return value;
    }

    const term = weight / (x - node);
    numerator += term * value;
    denominator += term;
  }

  return numerator / denominator;
}

/** Ordinary linear interpolation between two known points. */
export function linearInterpolate(
  xLeft: number,
  yLeft: number,
  xRight: number,
  yRight: number,
  x: number,
): number {
  if (x === xLeft) {
    return yLeft;
  }
  if (x === xRight) {
    return yRight;
  }
  return yLeft + ((x - xLeft) / (xRight - xLeft)) * (yRight - yLeft);
}

/**
 * Locate neighbouring anchors such that `anchors[left] <= x <= anchors[right]`.
 * `anchors` must be strictly increasing and already known to contain `x`.
 */
export function findBracket(
  anchors: readonly number[],
  x: number,
): readonly [left: number, right: number] {
  for (let index = 0; index < anchors.length; index += 1) {
    if (anchors[index] === x) {
      return [index, index];
    }
  }

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const left = anchors[index];
    const right = anchors[index + 1];
    if (left !== undefined && right !== undefined && x > left && x < right) {
      return [index, index + 1];
    }
  }

  throw new Error(`Value ${x} is outside the interpolation anchors`);
}
