import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRound } from '../js/round-results.js';
import { WinGoEngine } from '../js/wingo-engine.js';
import { studioConfig } from '../js/studio-config.js';

test('winning receipt uses the actual settled return after fees', () => {
  const engine = new WinGoEngine(studioConfig);
  engine.setOutcome(0);
  engine.placeBet({ type:'color', value:'Violet' }, 1000);
  engine.placeBet({ type:'size', value:'Small' }, 1000);
  const result = engine.nextRound(), summary = summarizeRound(result, engine.bets);
  assert.equal(summary.outcome, 'won');
  assert.equal(summary.payout, 637000); // ₹4,410 violet + ₹1,960 Small.
  assert.equal(summary.stake, 200000);
  assert.equal(summary.number, 0);
  assert.deepEqual(summary.colors, ['Red','Violet']);
  assert.equal(summary.count, 2);
});

test('losing receipt has no bonus, excludes pending bets and other rooms/periods', () => {
  const engine = new WinGoEngine(studioConfig);
  engine.placeBet({ type:'number', value:2 }, 10);
  const result = engine.nextRound();
  engine.placeBet({ type:'size', value:'Big' }, 10);
  const other = { ...engine.bets[1], room:30, payout:999999 };
  const summary = summarizeRound(result, [...engine.bets,other]);
  assert.equal(summary.outcome, 'lost');
  assert.equal(summary.payout, 0);
  assert.equal(summary.stake, 1000);
  assert.equal(summary.count, 1);
  assert.equal(summarizeRound({...result,period:'unplayed'},engine.bets), null);
});

test('mixed winning/losing bets report the return once without changing the wallet', () => {
  const engine = new WinGoEngine(studioConfig);
  engine.placeBet({ type:'number', value:7 }, 10);
  engine.placeBet({ type:'number', value:2 }, 10);
  const result = engine.nextRound(), balance = engine.balance;
  const summary = summarizeRound(result, engine.bets);
  assert.equal(summary.payout, 8820);
  assert.equal(summary.stake, 2000);
  assert.equal(summary.count, 2);
  assert.equal(summary.outcome, 'won');
  summarizeRound(result, engine.bets);
  assert.equal(engine.balance, balance);
});
