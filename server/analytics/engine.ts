import { CalculatedBar, IndicatorConfig, NormalizedBar, TickerSummaryStats } from '../mcp/types.ts';

/**
 * Calculates Simple Moving Average (SMA) for an array of prices
 * @param prices Array of close prices in chronological order
 * @param period Lookback window size
 * @returns Array of SMA values aligned with input length (null for indices < period - 1)
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period || period <= 0) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  result[period - 1] = Number((sum / period).toFixed(4));

  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    result[i] = Number((sum / period).toFixed(4));
  }

  return result;
}

/**
 * Calculates Exponential Moving Average (EMA) for an array of prices
 * @param prices Array of close prices in chronological order
 * @param period Lookback window size
 * @returns Array of EMA values aligned with input length
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period || period <= 0) return result;

  const multiplier = 2 / (period + 1);

  // Initialize first EMA with SMA of first period elements
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let prevEMA = sum / period;
  result[period - 1] = Number(prevEMA.toFixed(4));

  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] - prevEMA) * multiplier + prevEMA;
    result[i] = Number(currentEMA.toFixed(4));
    prevEMA = currentEMA;
  }

  return result;
}

/**
 * Calculates Rolling Sample/Population Standard Deviation over window N
 * @param prices Array of prices in chronological order
 * @param window Window size N
 * @returns Array of standard deviation values aligned with input length
 */
export function calculateRollingStdDev(prices: number[], window: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < window || window <= 1) return result;

  for (let i = window - 1; i < prices.length; i++) {
    const slice = prices.slice(i - window + 1, i + 1);
    const mean = slice.reduce((acc, val) => acc + val, 0) / window;
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / window;
    result[i] = Number(Math.sqrt(variance).toFixed(4));
  }

  return result;
}

/**
 * Calculates Bollinger Bands (SMA +/- k * StdDev)
 * @param prices Array of close prices
 * @param period Lookback window (default 20)
 * @param multiplier StdDev multiplier k (default 2.0)
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2.0
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
} {
  const middle = calculateSMA(prices, period);
  const stdDev = calculateRollingStdDev(prices, period);

  const upper: (number | null)[] = new Array(prices.length).fill(null);
  const lower: (number | null)[] = new Array(prices.length).fill(null);
  const bandwidth: (number | null)[] = new Array(prices.length).fill(null);

  for (let i = 0; i < prices.length; i++) {
    const m = middle[i];
    const s = stdDev[i];
    if (m !== null && s !== null) {
      const up = Number((m + multiplier * s).toFixed(4));
      const lo = Number((m - multiplier * s).toFixed(4));
      upper[i] = up;
      lower[i] = lo;
      bandwidth[i] = m > 0 ? Number((((up - lo) / m) * 100).toFixed(2)) : null;
    }
  }

  return { upper, middle, lower, bandwidth };
}

/**
 * Calculates Percentage Change relative to the start of the timeframe
 * PctChange_t = ((Close_t - Close_0) / Close_0) * 100
 */
export function calculateNormalizedPercentage(prices: number[]): number[] {
  if (prices.length === 0) return [];
  const base = prices[0];
  if (base === 0) return prices.map(() => 0);

  return prices.map((p) => Number((((p - base) / base) * 100).toFixed(3)));
}

/**
 * Evaluates moving average crossover and trend signals
 */
export function evaluateMASignals(
  currentPrice: number,
  sma20: number | null,
  sma50: number | null,
  sma200: number | null
): { signal: TickerSummaryStats['maSignal']; details: string } {
  if (sma50 !== null && sma200 !== null) {
    if (sma50 > sma200 && currentPrice > sma50) {
      return {
        signal: 'Strong Bullish',
        details: 'Golden Cross regime (SMA50 > SMA200) with price above SMA50',
      };
    }
    if (sma50 < sma200 && currentPrice < sma50) {
      return {
        signal: 'Strong Bearish',
        details: 'Death Cross regime (SMA50 < SMA200) with price below SMA50',
      };
    }
  }

  if (sma20 !== null) {
    if (currentPrice > sma20) {
      return {
        signal: 'Bullish',
        details: `Trading ${(currentPrice - sma20).toFixed(2)} above 20-period SMA`,
      };
    } else {
      return {
        signal: 'Bearish',
        details: `Trading ${(sma20 - currentPrice).toFixed(2)} below 20-period SMA`,
      };
    }
  }

  return { signal: 'Neutral', details: 'Insufficient historical data for complete crossover analysis' };
}

/**
 * Enriches normalized market bars with technical metrics
 */
export function enrichBarsWithIndicators(
  bars: NormalizedBar[],
  config: IndicatorConfig
): CalculatedBar[] {
  if (!bars || bars.length === 0) return [];

  const closePrices = bars.map((b) => b.close);

  // Compute SMAs
  const smaMap: Record<number, (number | null)[]> = {};
  for (const period of config.smaPeriods) {
    smaMap[period] = calculateSMA(closePrices, period);
  }

  // Compute EMAs
  const emaMap: Record<number, (number | null)[]> = {};
  for (const period of config.emaPeriods) {
    emaMap[period] = calculateEMA(closePrices, period);
  }

  // Compute Bollinger Bands
  const bb = config.bollinger.enabled
    ? calculateBollingerBands(
        closePrices,
        config.bollinger.period,
        config.bollinger.stdDevMultiplier
      )
    : null;

  // Compute Rolling StdDev
  const rollingStdDev = calculateRollingStdDev(closePrices, config.volatilityWindow);

  // Compute Normalized Percentage
  const normalizedPercentages = calculateNormalizedPercentage(closePrices);

  return bars.map((bar, idx) => {
    const smaVals: Record<number, number | null> = {};
    for (const p of config.smaPeriods) {
      smaVals[p] = smaMap[p][idx];
    }

    const emaVals: Record<number, number | null> = {};
    for (const p of config.emaPeriods) {
      emaVals[p] = emaMap[p][idx];
    }

    return {
      ...bar,
      sma: smaVals,
      ema: emaVals,
      bollinger: bb
        ? {
            upper: bb.upper[idx],
            middle: bb.middle[idx],
            lower: bb.lower[idx],
            bandwidth: bb.bandwidth[idx],
          }
        : undefined,
      rollingStdDev: rollingStdDev[idx],
      normalizedPct: normalizedPercentages[idx],
    };
  });
}

/**
 * Calculates a portfolio allocation totaling 100% based on each stock's volatility.
 * Implements Inverse Volatility (Risk Parity proxy), Inverse Variance, and Equal Weighting.
 */
export function calculatePortfolioAllocation(
  items: {
    symbol: string;
    name: string;
    volatility: number;
    currentPrice: number;
    color: string;
  }[],
  method: 'inverse_volatility' | 'inverse_variance' | 'equal_weight' = 'inverse_volatility',
  totalCapital: number = 100000
) {
  if (items.length === 0) {
    return {
      method,
      totalCapital,
      allocations: [],
      weightedPortfolioVolatility: 0,
      diversificationBenefitPct: 0,
    };
  }

  if (items.length === 1) {
    const item = items[0];
    const shares = item.currentPrice > 0 ? Number((totalCapital / item.currentPrice).toFixed(2)) : 0;
    return {
      method,
      totalCapital,
      allocations: [
        {
          symbol: item.symbol,
          name: item.name,
          volatility: item.volatility,
          weight: 100.0,
          allocatedCapital: totalCapital,
          sharesToBuy: shares,
          currentPrice: item.currentPrice,
          color: item.color,
        },
      ],
      weightedPortfolioVolatility: item.volatility,
      diversificationBenefitPct: 0,
    };
  }

  // Calculate raw weights
  const rawWeights: number[] = items.map((it) => {
    const vol = Math.max(0.01, it.volatility);
    if (method === 'inverse_variance') {
      return 1 / (vol * vol);
    } else if (method === 'equal_weight') {
      return 1;
    }
    // Default: inverse_volatility (Risk Parity)
    return 1 / vol;
  });

  const sumRaw = rawWeights.reduce((a, b) => a + b, 0);

  // Compute unadjusted weights and round to 2 decimals
  const roundedWeights = rawWeights.map((rw) => Number(((rw / sumRaw) * 100).toFixed(2)));

  // Ensure exact 100.00% total
  const currentTotal = roundedWeights.reduce((a, b) => a + b, 0);
  const diff = Number((100.0 - currentTotal).toFixed(2));

  // Add the floating precision residual to the largest item
  let maxIdx = 0;
  for (let i = 1; i < roundedWeights.length; i++) {
    if (roundedWeights[i] > roundedWeights[maxIdx]) maxIdx = i;
  }
  roundedWeights[maxIdx] = Number((roundedWeights[maxIdx] + diff).toFixed(2));

  // Build allocation records
  const allocations = items.map((it, idx) => {
    const weight = roundedWeights[idx];
    const allocatedCapital = Number(((weight / 100) * totalCapital).toFixed(2));
    const sharesToBuy =
      it.currentPrice > 0 ? Number((allocatedCapital / it.currentPrice).toFixed(2)) : 0;

    return {
      symbol: it.symbol,
      name: it.name,
      volatility: it.volatility,
      weight,
      allocatedCapital,
      sharesToBuy,
      currentPrice: it.currentPrice,
      color: it.color,
    };
  });

  // Calculate portfolio volatility metrics
  const avgCorr = 0.45; // average cross-stock correlation assumption
  let varianceSum = 0;
  let simpleWeightedVol = 0;

  for (let i = 0; i < items.length; i++) {
    const wi = roundedWeights[i] / 100;
    const si = Math.max(0.01, items[i].volatility);
    simpleWeightedVol += wi * si;
    varianceSum += wi * wi * si * si;

    for (let j = i + 1; j < items.length; j++) {
      const wj = roundedWeights[j] / 100;
      const sj = Math.max(0.01, items[j].volatility);
      varianceSum += 2 * wi * wj * si * sj * avgCorr;
    }
  }

  const weightedPortfolioVolatility = Number(Math.sqrt(Math.max(0, varianceSum)).toFixed(2));
  const diversificationBenefitPct = Number(
    Math.max(
      0,
      ((simpleWeightedVol - weightedPortfolioVolatility) / Math.max(0.01, simpleWeightedVol)) * 100
    ).toFixed(1)
  );

  return {
    method,
    totalCapital,
    allocations,
    weightedPortfolioVolatility,
    diversificationBenefitPct,
  };
}
