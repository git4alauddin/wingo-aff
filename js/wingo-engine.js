// Pure simulation model. Amounts are stored as integer paise.
export function resultFor(number) {
  if (!Number.isInteger(number) || number < 0 || number > 9) throw new RangeError('Result must be a digit from 0 to 9.');
  return { number, size: number < 5 ? 'Small' : 'Big', colors: number === 0 ? ['Red', 'Violet'] : number === 5 ? ['Green', 'Violet'] : [number % 2 ? 'Green' : 'Red'] };
}

export function payoutMultiplier(selection, number) {
  const result = resultFor(number);
  if (selection.type === 'number') return selection.value === number ? 9 : 0;
  if (selection.type === 'size') return selection.value === result.size ? 2 : 0;
  if (selection.type === 'color' && result.colors.includes(selection.value)) {
    if (selection.value === 'Violet') return 4.5;
    return number === 0 || number === 5 ? 1.5 : 2;
  }
  return 0;
}

export function validSelection(selection) {
  return selection && (selection.type === 'number' && Number.isInteger(selection.value) && selection.value >= 0 && selection.value <= 9
    || selection.type === 'color' && ['Red', 'Green', 'Violet'].includes(selection.value)
    || selection.type === 'size' && ['Big', 'Small'].includes(selection.value));
}

export class WinGoEngine {
  constructor(settings, now = new Date()) {
    if (!settings.outcomes?.length || settings.outcomes.some(n => !Number.isInteger(n) || n < 0 || n > 9)) throw new RangeError('Configure at least one valid outcome.');
    if (!(settings.startingBalance >= 0) || !(settings.serviceFee >= 0 && settings.serviceFee < 1)) throw new RangeError('Invalid balance or fee.');
    this.settings = settings;
    this.balance = Math.round(settings.startingBalance * 100);
    this.paused = false;
    this.betSequence = 0;
    this.bets = [];
    this.activeRoom = settings.defaultRoom;
    // Match the reference's date/mode/sequence style without claiming live period IDs.
    this.datePrefix = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
    this.rooms = new Map(settings.rooms.map((seconds, index) => {
      if (!(seconds > settings.lockSeconds)) throw new RangeError('Room must exceed the lock window.');
      const room = { seconds, mode: index + 1, sequence: 1001, elapsed: 0, preset: 0, override: null, lastResult: null, history: [] };
      room.history = Array.from({ length: 100 }, (_, i) => ({
        period: this.period(room, room.sequence - i - 1), ...resultFor(settings.historySeed[i % settings.historySeed.length]),
      }));
      return [seconds, room];
    }));
    if (!this.rooms.has(this.activeRoom)) throw new RangeError('Unknown default room.');
  }

  period(room, sequence = room.sequence) { return `${this.datePrefix}${String(room.mode).padStart(2, '0')}${String(sequence).padStart(5, '0')}`; }
  get room() { return this.rooms.get(this.activeRoom); }
  snapshot() {
    const room = this.room;
    const remaining = Math.max(0, Math.ceil((room.seconds * 1000 - room.elapsed) / 1000));
    const number = room.override ?? this.settings.outcomes[room.preset % this.settings.outcomes.length];
    return { period: this.period(room), seconds: room.seconds, remaining, locked: remaining <= this.settings.lockSeconds, paused: this.paused, result: resultFor(number), history: room.history, lastResult: room.lastResult };
  }
  switchRoom(seconds) {
    if (!this.rooms.has(seconds)) throw new RangeError('Unknown room.');
    this.activeRoom = seconds;
  }
  setOutcome(number) { resultFor(number); this.room.override = number; }
  tick(deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('Invalid elapsed time.');
    if (this.paused) return [];
    const completed = [];
    for (const room of this.rooms.values()) {
      room.elapsed += deltaMs;
      while (room.elapsed >= room.seconds * 1000) {
        room.elapsed -= room.seconds * 1000;
        completed.push(this.settle(room));
      }
    }
    return completed;
  }
  nextRound() { this.room.elapsed = 0; return this.settle(this.room); }
  settle(room) {
    const number = room.override ?? this.settings.outcomes[room.preset % this.settings.outcomes.length];
    const result = { period: this.period(room), ...resultFor(number) };
    for (const bet of this.bets) {
      if (bet.status !== 'pending' || bet.period !== result.period || bet.room !== room.seconds) continue;
      const rate = payoutMultiplier(bet.selection, number);
      // Round the fee first, then the return; keep both in paise.
      bet.fee = Math.round(bet.amount * this.settings.serviceFee);
      bet.payout = Math.round((bet.amount - bet.fee) * rate);
      bet.status = rate ? 'won' : 'lost';
      bet.result = number;
      this.balance += bet.payout;
    }
    room.history.unshift(result);
    room.history.length = Math.min(room.history.length, this.settings.historyLimit);
    room.lastResult = result;
    room.sequence++;
    room.preset++;
    room.override = null;
    return { ...result, room: room.seconds };
  }
  placeBet(selection, stake, multiplier = 1, expectedPeriod = this.snapshot().period) {
    const state = this.snapshot();
    if (expectedPeriod !== state.period) throw new Error('The round changed. Please select again.');
    if (state.locked) throw new Error('This round is locked. Wait for the next period.');
    if (!validSelection(selection)) throw new Error('Choose a number, color, or size.');
    if (!Number.isFinite(stake) || stake < this.settings.minStake || !Number.isInteger(multiplier) || multiplier < 1 || multiplier > 100) throw new Error('Enter a valid stake and multiplier.');
    const amount = Math.round(stake * 100) * multiplier;
    if (amount > Math.round(this.settings.maxStake * 100)) throw new Error(`Maximum total stake is ₹${this.settings.maxStake}.`);
    if (amount > this.balance) throw new Error('Insufficient virtual balance.');
    const bet = { id: ++this.betSequence, period: state.period, room: state.seconds, selection: { ...selection }, amount, status: 'pending', payout: 0, fee: 0 };
    this.balance -= amount;
    this.bets.unshift(bet);
    return bet;
  }
  resetBalance() {
    if (this.bets.some(bet => bet.status === 'pending')) throw new Error('Settle pending bets before resetting the balance.');
    this.balance = Math.round(this.settings.startingBalance * 100);
  }
}

export function statistics(history) {
  const recent = history.slice(0, 100);
  return Array.from({ length: 10 }, (_, number) => {
    let gap = 0, run = 0, maxRun = 0;
    const gaps = [];
    for (const row of recent) {
      if (row.number === number) { gaps.push(gap); gap = 0; maxRun = Math.max(maxRun, ++run); }
      else { gap++; run = 0; }
    }
    const missing = recent.findIndex(row => row.number === number);
    return { number, missing: missing < 0 ? recent.length : missing, average: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : recent.length, frequency: gaps.length, maxConsecutive: maxRun };
  });
}
