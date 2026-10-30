import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToHsv, hsvToHex } from '../../apps/desktop/src/views/icon-color.ts';
test('custom icon color converts HSV and HEX without losing selected RGB colors', () => {
  for (const hex of ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#efcbb5', '#ef4444', '#6366f1']) {
    const hsv = hexToHsv(hex);
    assert.equal(hsvToHex(hsv.h, hsv.s, hsv.v), hex);
  }
  assert.equal(hsvToHex(180, 1, 1), '#00ffff');
  assert.equal(hsvToHex(60, 1, 1), '#ffff00');
  assert.equal(hsvToHex(300, 0, 0.5), '#808080');
});
