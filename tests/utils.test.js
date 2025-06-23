import { getSystemFontFallbacks } from '../src/modules/utils.js';

test('getSystemFontFallbacks returns sans-serif for sans', () => {
  expect(getSystemFontFallbacks('sans')).toMatch(/sans-serif/);
});
