import {
  AllocationMethod,
  ComparisonDataset,
  PortfolioAllocationItem,
  PortfolioAllocationSummary,
  TICKER_PALETTE,
} from '../types/market.ts';

/**
 * Calculates portfolio allocation totaling exactly 100.00% based on each stock's volatility.
 */
export function calculatePortfolioAllocation(
  datasets: ComparisonDataset[],
  method: AllocationMethod = 'inverse_volatility',
  totalCapital: number = 100000
): PortfolioAllocationSummary {
  if (!datasets || datasets.length === 0) {
    return {
      method,
      totalCapital,
      allocations: [],
      weightedPortfolioVolatility: 0,
      diversificationBenefitPct: 0,
    };
  }

  // Extract items with valid volatility
  const items = datasets.map((d, idx) => {
    // Use annualized volatility if available, otherwise rolling stddev or fallback
    const vol =
      d.summary.annualizedVolatility > 0
        ? d.summary.annualizedVolatility
        : d.summary.rollingStdDev > 0
        ? d.summary.rollingStdDev * Math.sqrt(252)
        : 25.0;

    return {
      symbol: d.symbol,
      name: d.quote.name || d.summary.name || d.symbol,
      volatility: Number(vol.toFixed(2)),
      currentPrice: d.quote.price || d.summary.currentPrice || 100,
      color: d.color || TICKER_PALETTE[idx % TICKER_PALETTE.length],
    };
  });

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

  // 1. Calculate raw weights based on chosen method
  const rawWeights: number[] = items.map((it) => {
    const vol = Math.max(0.01, it.volatility);
    if (method === 'inverse_variance') {
      return 1 / (vol * vol);
    } else if (method === 'equal_weight') {
      return 1;
    }
    // Default: inverse_volatility (Risk Parity proxy: lower vol -> higher weight)
    return 1 / vol;
  });

  const sumRaw = rawWeights.reduce((a, b) => a + b, 0);

  // 2. Compute initial weights rounded to 2 decimals
  const roundedWeights = rawWeights.map((rw) => Number(((rw / sumRaw) * 100).toFixed(2)));

  // 3. Strictly guarantee that total sum equals exactly 100.00%
  const currentTotal = Number(roundedWeights.reduce((a, b) => a + b, 0).toFixed(2));
  const diff = Number((100.0 - currentTotal).toFixed(2));

  // Add the fractional residual (e.g. +0.01% or -0.01%) to the largest component
  let maxIdx = 0;
  for (let i = 1; i < roundedWeights.length; i++) {
    if (roundedWeights[i] > roundedWeights[maxIdx]) maxIdx = i;
  }
  roundedWeights[maxIdx] = Number((roundedWeights[maxIdx] + diff).toFixed(2));

  // 4. Calculate allocated capital and shares
  const allocations: PortfolioAllocationItem[] = items.map((it, idx) => {
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

  // 5. Portfolio Volatility with diversification correlation
  const avgCorr = 0.45; // average cross-stock correlation
  let varianceSum = 0;
  let simpleWeightedVol = 0;

  for (let i = 0; i < items.length; i++) {
    const wi = roundedWeights[i] / 100;
    const si = items[i].volatility;
    simpleWeightedVol += wi * si;
    varianceSum += wi * wi * si * si;

    for (let j = i + 1; j < items.length; j++) {
      const wj = roundedWeights[j] / 100;
      const sj = items[j].volatility;
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
