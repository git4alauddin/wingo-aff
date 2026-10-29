import test from 'node:test';
import assert from 'node:assert/strict';
import { WinGoEngine, resultFor, payoutMultiplier, statistics } from '../js/wingo-engine.js';
import { studioConfig } from '../js/studio-config.js';
const create = (overrides = {}) => new WinGoEngine({ ...studioConfig, ...overrides }, new Date(2026, 9, 29));

test('all ten results have the correct color and size, including both dual-color digits', () => {
  const expected = [
    ['Small', ['Red', 'Violet']], ['Small', ['Green']], ['Small', ['Red']], ['Small', ['Green']], ['Small', ['Red']],
    ['Big', ['Green', 'Violet']], ['Big', ['Red']], ['Big', ['Green']], ['Big', ['Red']], ['Big', ['Green']],
  ];
  expected.forEach(([size, colors], number) => assert.deepEqual(resultFor(number), { number, size, colors }));
  for (const invalid of [-1, 10, 1.5, NaN, '7']) assert.throws(() => resultFor(invalid));
});

test('payout categories match the published Studio rules across every possible result', () => {
  const rates = {
    Red: [1.5, 0, 2, 0, 2, 0, 2, 0, 2, 0], Green: [0, 2, 0, 2, 0, 1.5, 0, 2, 0, 2],
    Violet: [4.5, 0, 0, 0, 0, 4.5, 0, 0, 0, 0], Small: [2, 2, 2, 2, 2, 0, 0, 0, 0, 0], Big: [0, 0, 0, 0, 0, 2, 2, 2, 2, 2],
  };
  for (const [value, expected] of Object.entries(rates)) expected.forEach((rate, n) => assert.equal(payoutMultiplier({ type: ['Big', 'Small'].includes(value) ? 'size' : 'color', value }, n), rate));
  for (let bet = 0; bet < 10; bet++) for (let result = 0; result < 10; result++) assert.equal(payoutMultiplier({ type: 'number', value: bet }, result), bet === result ? 9 : 0);
});

test('mixed bets debit once and settle once against the same predicted number', () => {
  const engine = create({ startingBalance: 1000 });
  engine.setOutcome(0);
  const before = engine.snapshot();
  assert.equal(before.result.number, 0);
  const red = engine.placeBet({ type: 'color', value: 'Red' }, 10);
  const violet = engine.placeBet({ type: 'color', value: 'Violet' }, 10);
  const exact = engine.placeBet({ type: 'number', value: 0 }, 10);
  const lost = engine.placeBet({ type: 'size', value: 'Big' }, 10);
  assert.equal(engine.balance, 96000);
  engine.nextRound();
  assert.equal(red.payout, 1470); assert.equal(violet.payout, 4410); assert.equal(exact.payout, 8820); assert.equal(lost.payout, 0);
  assert.equal(engine.balance, 110700);
  assert.equal(engine.snapshot().history[0].period, before.period);
  assert.equal(engine.snapshot().history[0].number, before.result.number);
  engine.nextRound(); assert.equal(engine.balance, 110700);
});

test('fee and payout arithmetic remains in paise with fractional stakes and multipliers', () => {
  const engine = create(); engine.setOutcome(7);
  const bet = engine.placeBet({ type: 'number', value: 7 }, 1.01, 5);
  assert.equal(bet.amount, 505); engine.nextRound();
  assert.equal(bet.fee, 10); assert.equal(bet.payout, 4455);
  assert.equal(engine.balance, 2999900 - 505 + 4455);
});

test('last five seconds lock new bets, stale dialogs cannot place in a later period', () => {
  const engine = create(); const period = engine.snapshot().period;
  engine.tick(54999); assert.equal(engine.snapshot().locked, false);
  engine.tick(1); assert.equal(engine.snapshot().remaining, 5); assert.equal(engine.snapshot().locked, true);
  assert.throws(() => engine.placeBet({ type: 'size', value: 'Big' }, 10), /locked/);
  engine.tick(5000); assert.equal(engine.snapshot().locked, false);
  assert.notEqual(engine.snapshot().period, period);
  assert.throws(() => engine.placeBet({ type: 'size', value: 'Big' }, 10, 1, period), /round changed/);
});

test('rooms keep independent periods and outcomes and settle in the background', () => {
  const engine = create({ outcomes: [7, 2] });
  engine.switchRoom(30); engine.setOutcome(0);
  const bet = engine.placeBet({ type: 'number', value: 0 }, 10);
  const firstPeriod = engine.snapshot().period;
  engine.switchRoom(60); engine.tick(30000);
  assert.equal(bet.status, 'won'); assert.equal(engine.snapshot().history[0].number, 0); // seed, not a new 1-min draw
  assert.equal(engine.snapshot().remaining, 30);
  engine.switchRoom(30);
  assert.notEqual(engine.snapshot().period, firstPeriod);
  assert.equal(engine.snapshot().history[0].number, 0);
  assert.equal(engine.snapshot().result.number, 2);
});

test('pause freezes every room; next settles explicitly; resume preserves the remaining time', () => {
  const engine = create(); engine.tick(12000); engine.paused = true;
  assert.deepEqual(engine.tick(600000), []); assert.equal(engine.snapshot().remaining, 48);
  const id = engine.snapshot().period; engine.nextRound(); assert.notEqual(engine.snapshot().period, id);
  assert.equal(engine.snapshot().remaining, 60); engine.paused = false; engine.tick(1000); assert.equal(engine.snapshot().remaining, 59);
});

test('invalid or unaffordable bets never debit funds, and reset cannot discard pending bets', () => {
  const engine = create({ startingBalance: 10 }); const balance = engine.balance;
  const invalid = [
    [ { type: 'number', value: 11 }, 1, 1 ], [ { type: 'color', value: 'Blue' }, 1, 1 ],
    [ { type: 'size', value: 'Big' }, -1, 1 ], [ { type: 'size', value: 'Big' }, NaN, 1 ],
    [ { type: 'size', value: 'Big' }, 1, 1.5 ], [ { type: 'size', value: 'Big' }, 1, 101 ],
    [ { type: 'size', value: 'Big' }, 11, 1 ], [ { type: 'size', value: 'Big' }, 10000, 100 ],
  ];
  for (const args of invalid) { assert.throws(() => engine.placeBet(...args)); assert.equal(engine.balance, balance); }
  engine.placeBet({ type: 'size', value: 'Big' }, 1);
  assert.throws(() => engine.resetBalance(), /pending/);
  engine.nextRound(); engine.resetBalance(); assert.equal(engine.balance, balance);
});

test('history stays capped and chart statistics use only the latest 100 completed periods', () => {
  const engine = create({ historyLimit: 100 });
  engine.tick(300000); assert.equal(engine.room.history.length, 100);
  const rows = [7, 7, 2, 7, 0].map(number => resultFor(number));
  const stats = statistics(rows); assert.equal(stats[7].frequency, 3); assert.equal(stats[7].maxConsecutive, 2); assert.equal(stats[7].missing, 0);
  assert.equal(stats[2].missing, 2); assert.equal(stats[9].frequency, 0); assert.equal(stats[9].missing, 5);
});
