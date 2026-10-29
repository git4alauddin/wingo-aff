import test from 'node:test';
import assert from 'node:assert/strict';
import { predictionConfig } from '../js/prediction-config.js';
import { settlementForNumber } from '../js/prediction-model.js';
import { resultFor } from '../js/wingo-engine.js';

test('visitor prediction keeps the four original 1-minute combinations and staggered timing', () => {
  assert.equal(predictionConfig.gameName, 'WinGo[1 Min]');
  assert.deepEqual(predictionConfig.settlements, [
    { numbers: [1, 3], size: 'Small', color: 'Green' },
    { numbers: [2, 4], size: 'Small', color: 'Red' },
    { numbers: [6, 8], size: 'Big', color: 'Red' },
    { numbers: [7, 9], size: 'Big', color: 'Green' },
  ]);
  assert.equal(predictionConfig.spinDurationMs, 2400);
  assert.equal(predictionConfig.reelStaggerMs, 180);
});

test('each Studio result belongs to the displayed pair, with a size and color shared by both digits', () => {
  for (let number = 0; number <= 9; number++) {
    const row = settlementForNumber(number);
    assert.equal(row.numbers.length, 2);
    assert.ok(row.numbers.includes(number), `The pair must include result ${number}`);
    assert.notEqual(row.numbers[0], row.numbers[1]);
    for (const digit of row.numbers) {
      const result = resultFor(digit);
      assert.equal(row.size, result.size);
      assert.ok(result.colors.includes(row.color));
    }
  }
  assert.deepEqual(settlementForNumber(0), { numbers: [0, 2], size: 'Small', color: 'Red' });
  assert.deepEqual(settlementForNumber(5), { numbers: [5, 7], size: 'Big', color: 'Green' });
});

test('Studio mapping cannot change the shared presets or accept an invalid digit', () => {
  const row = settlementForNumber(7); row.numbers[0] = 0;
  assert.deepEqual(settlementForNumber(7).numbers, [7, 9]);
  assert.throws(() => settlementForNumber(-1));
  assert.throws(() => settlementForNumber(10));
});
