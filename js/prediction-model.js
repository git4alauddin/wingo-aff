import { resultFor } from './wingo-engine.js';
import { predictionConfig } from './prediction-config.js';

/** Keep the reference's linked two-number combinations consistent with Studio. */
export function settlementForNumber(number, settlements = predictionConfig.settlements) {
  const result = resultFor(number);
  const exact = settlements.find(row => row.numbers.includes(number)
    && row.size === result.size && result.colors.includes(row.color));
  if (exact) return { ...exact, numbers: [...exact.numbers] };
  // 0 and 5 also carry red/green. Pair each with a digit sharing that size/color.
  const compatible = settlements.find(row => row.size === result.size && result.colors.includes(row.color));
  if (!compatible) throw new RangeError('No compatible prediction combination is configured.');
  return { numbers: [number, compatible.numbers[0]], size: result.size, color: compatible.color };
}
