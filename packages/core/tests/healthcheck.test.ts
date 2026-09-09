import { expect, test } from 'vitest';
import { coreHealthcheck } from '../src/index';

test('coreHealthcheck returns ok', () => {
  expect(coreHealthcheck()).toBe('ok');
});
