export const studioConfig = Object.freeze({
  accessCode: '@creator',
  startingBalance: 29999,
  defaultStake: 10,
  minStake: 1,
  maxStake: 10000,
  lockSeconds: 5,
  serviceFee: 0.02,
  rooms: [30, 60, 180, 300],
  defaultRoom: 60,
  // One result drives the number, color, size, settlement, and prediction.
  outcomes: [7, 2, 0, 5, 9, 4, 1, 8, 3, 6],
  historySeed: [
    0, 0, 7, 5, 5, 5, 4, 3, 6, 4,
    8, 2, 1, 9, 7, 3, 6, 0, 5, 8,
    2, 4, 9, 1, 6, 7, 8, 2, 3, 0,
    1, 5, 9, 4, 6, 8, 0, 7, 3, 2,
    9, 6, 5, 1, 4, 0, 8, 3, 2, 7,
  ],
  historyLimit: 500,
  disclaimer: 'CREATOR STUDIO · DEMO SIMULATION · VIRTUAL CREDITS',
});
