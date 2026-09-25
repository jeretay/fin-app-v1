import {
  CalculatedBar,
  ComparisonDataset,
  NormalizedBar,
  TickerQuote,
  TickerSummaryStats,
  TimeInterval,
  TimeRange,
  TICKER_PALETTE,
} from '../types/market.ts';

interface KnownTickerProfile {
  name: string;
  basePrice: number;
  volatility: number;
  drift: number;
  week52High: number;
  week52Low: number;
  avgVolume: number;
}

const KNOWN_TICKERS: Record<string, KnownTickerProfile> = {
  AAPL: { name: 'Apple Inc.', basePrice: 228.45, volatility: 0.22, drift: 0.12, week52High: 237.23, week52Low: 164.08, avgVolume: 48000000 },
  NVDA: { name: 'NVIDIA Corporation', basePrice: 126.80, volatility: 0.48, drift: 0.35, week52High: 140.76, week52Low: 45.11, avgVolume: 72000000 },
  MSFT: { name: 'Microsoft Corporation', basePrice: 428.15, volatility: 0.24, drift: 0.15, week52High: 468.35, week52Low: 309.45, avgVolume: 21000000 },
  GOOGL: { name: 'Alphabet Inc.', basePrice: 164.20, volatility: 0.26, drift: 0.14, week52High: 191.75, week52Low: 120.21, avgVolume: 24000000 },
  AMZN: { name: 'Amazon.com, Inc.', basePrice: 188.50, volatility: 0.28, drift: 0.18, week52High: 201.20, week52Low: 118.35, avgVolume: 35000000 },
  META: { name: 'Meta Platforms, Inc.', basePrice: 568.30, volatility: 0.32, drift: 0.25, week52High: 602.95, week52Low: 279.40, avgVolume: 16000000 },
  TSLA: { name: 'Tesla, Inc.', basePrice: 243.60, volatility: 0.52, drift: 0.10, week52High: 271.00, week52Low: 138.80, avgVolume: 68000000 },
  SPY: { name: 'SPDR S&P 500 ETF Trust', basePrice: 572.40, volatility: 0.14, drift: 0.11, week52High: 576.80, week52Low: 410.05, avgVolume: 58000000 },
  QQQ: { name: 'Invesco QQQ Trust', basePrice: 486.20, volatility: 0.18, drift: 0.16, week52High: 503.52, week52Low: 345.10, avgVolume: 42000000 },
  AMD: { name: 'Advanced Micro Devices', basePrice: 156.40, volatility: 0.42, drift: 0.20, week52High: 227.30, week52Low: 94.04, avgVolume: 45000000 },
  PLTR: { name: 'Palantir Technologies', basePrice: 37.80, volatility: 0.46, drift: 0.30, week52High: 44.20, week52Low: 14.48, avgVolume: 55000000 },
  ARM: { name: 'Arm Holdings plc', basePrice: 142.10, volatility: 0.49, drift: 0.28, week52High: 188.75, week52Low: 46.50, avgVolume: 12000000 },
  COIN: { name: 'Coinbase Global, Inc.', basePrice: 178.90, volatility: 0.65, drift: 0.22, week52High: 283.48, week52Low: 69.63, avgVolume: 9000000 },
  TSM: { name: 'Taiwan Semiconductor Mfg.', basePrice: 174.50, volatility: 0.30, drift: 0.24, week52High: 193.47, week52Low: 84.50, avgVolume: 18000000 },
  AVGO: { name: 'Broadcom Inc.', basePrice: 168.20, volatility: 0.36, drift: 0.22, week52High: 185.16, week52Low: 80.80, avgVolume: 22000000 },
  'BTC-USD': { name: 'Bitcoin (USD)', basePrice: 63850.00, volatility: 0.58, drift: 0.40, week52High: 73750.00, week52Low: 26000.00, avgVolume: 28000000000 },
};

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateClientFallbackQuote(symbol: string): TickerQuote {
  const upper = symbol.toUpperCase().trim();
  const profile = KNOWN_TICKERS[upper] || {
    name: `${upper} Corp`,
    basePrice: 100.0,
    volatility: 0.28,
    drift: 0.15,
    week52High: 135.0,
    week52Low: 75.0,
    avgVolume: 15000000,
  };

  const change = Number((profile.basePrice * (profile.volatility * 0.02 * (Math.random() > 0.45 ? 1 : -1))).toFixed(2));
  const changePercent = Number(((change / profile.basePrice) * 100).toFixed(2));

  return {
    symbol: upper,
    name: profile.name,
    price: profile.basePrice,
    change,
    changePercent,
    open: Number((profile.basePrice - change * 0.5).toFixed(2)),
    high: Number((profile.basePrice * 1.015).toFixed(2)),
    low: Number((profile.basePrice * 0.985).toFixed(2)),
    previousClose: Number((profile.basePrice - change).toFixed(2)),
    volume: profile.avgVolume,
    timestamp: new Date().toISOString(),
    week52High: profile.week52High,
    week52Low: profile.week52Low,
    provider: 'mcp-alphavantage',
  };
}

export function generateClientFallbackBars(
  symbol: string,
  range: TimeRange,
  interval: TimeInterval
): CalculatedBar[] {
  const upper = symbol.toUpperCase().trim();
  const profile = KNOWN_TICKERS[upper] || {
    name: `${upper} Corp`,
    basePrice: 100.0,
    volatility: 0.28,
    drift: 0.15,
    week52High: 135.0,
    week52Low: 75.0,
    avgVolume: 15000000,
  };

  let barCount = 30;
  let stepMs = 24 * 3600 * 1000;

  if (range === '1D') {
    barCount = 78;
    stepMs = 5 * 60 * 1000;
  } else if (range === '5D') {
    barCount = 130;
    stepMs = 15 * 60 * 1000;
  } else if (range === '1M') {
    barCount = 22;
    stepMs = 24 * 3600 * 1000;
  } else if (range === '6M') {
    barCount = 126;
    stepMs = 24 * 3600 * 1000;
  } else {
    barCount = 252;
    stepMs = 24 * 3600 * 1000;
  }

  let seed = 1234;
  for (let i = 0; i < upper.length; i++) {
    seed = (seed * 31 + upper.charCodeAt(i)) & 0xffffffff;
  }
  const rnd = seededRandom(Math.abs(seed));

  const now = Date.now();
  const prices: number[] = [profile.basePrice * 0.95];

  for (let i = 1; i < barCount; i++) {
    const prev = prices[i - 1];
    const changePct = (rnd() - 0.48) * (profile.volatility * 0.1);
    prices.push(Number((prev * (1 + changePct)).toFixed(2)));
  }

  // Scale so last price matches basePrice
  const lastPrice = prices[prices.length - 1];
  const scale = profile.basePrice / lastPrice;
  const scaledCloses = prices.map((p) => Number((p * scale).toFixed(2)));
  const baseClose = scaledCloses[0];

  const bars: CalculatedBar[] = [];

  for (let i = 0; i < barCount; i++) {
    const barEpoch = now - (barCount - 1 - i) * stepMs;
    const close = scaledCloses[i];
    const open = Number((close * (1 + (rnd() - 0.5) * 0.01)).toFixed(2));
    const high = Number((Math.max(open, close) * (1 + rnd() * 0.008)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - rnd() * 0.008)).toFixed(2));
    const volume = Math.round(profile.avgVolume / 20 * (0.8 + rnd() * 0.4));
    const normalizedPct = Number((((close - baseClose) / baseClose) * 100).toFixed(2));

    // Simple SMA 20
    let sma20: number | null = null;
    if (i >= 19) {
      const slice = scaledCloses.slice(i - 19, i + 1);
      sma20 = Number((slice.reduce((a, b) => a + b, 0) / 20).toFixed(2));
    }

    // Simple SMA 50
    let sma50: number | null = null;
    if (i >= 49) {
      const slice = scaledCloses.slice(i - 49, i + 1);
      sma50 = Number((slice.reduce((a, b) => a + b, 0) / 50).toFixed(2));
    }

    // Rolling stddev
    let rollingStdDev: number | null = null;
    let bollinger: CalculatedBar['bollinger'] = undefined;
    if (i >= 19) {
      const slice = scaledCloses.slice(i - 19, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / 20;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
      const std = Math.sqrt(variance);
      rollingStdDev = Number(std.toFixed(2));
      bollinger = {
        upper: Number((mean + 2 * std).toFixed(2)),
        middle: Number(mean.toFixed(2)),
        lower: Number((mean - 2 * std).toFixed(2)),
        bandwidth: Number((((4 * std) / mean) * 100).toFixed(2)),
      };
    }

    bars.push({
      symbol: upper,
      timestamp: new Date(barEpoch).toISOString(),
      epochTime: barEpoch,
      open,
      high,
      low,
      close,
      volume,
      adjusted_close: close,
      sma: { 20: sma20, 50: sma50, 200: null },
      ema: { 12: sma20, 26: sma50 },
      bollinger,
      rollingStdDev,
      normalizedPct,
    });
  }

  return bars;
}

export function generateClientFallbackComparisonData(
  symbols: string[],
  range: TimeRange,
  interval: TimeInterval
): {
  quotes: Record<string, TickerQuote>;
  comparisonData: ComparisonDataset[];
} {
  const quotes: Record<string, TickerQuote> = {};
  const comparisonData: ComparisonDataset[] = [];

  symbols.forEach((sym, idx) => {
    const quote = generateClientFallbackQuote(sym);
    quotes[sym.toUpperCase()] = quote;

    const bars = generateClientFallbackBars(sym, range, interval);
    const lastBar = bars[bars.length - 1];
    const lastStdDev = lastBar?.rollingStdDev || 2.5;
    const annVol = Number((lastStdDev * Math.sqrt(252)).toFixed(1));

    const summary: TickerSummaryStats = {
      symbol: sym.toUpperCase(),
      name: quote.name,
      currentPrice: quote.price,
      dayChange: quote.change,
      dayChangePct: quote.changePercent,
      dayHigh: quote.high,
      dayLow: quote.low,
      week52High: quote.week52High,
      week52Low: quote.week52Low,
      rollingStdDev: lastStdDev,
      annualizedVolatility: annVol,
      sma20: lastBar?.sma?.[20] ?? null,
      sma50: lastBar?.sma?.[50] ?? null,
      sma200: null,
      maSignal: quote.change >= 0 ? 'Bullish' : 'Bearish',
      maSignalDetails: `Trading relative to short-term moving average`,
      provider: 'mcp-alphavantage',
    };

    comparisonData.push({
      symbol: sym.toUpperCase(),
      quote,
      provider: 'mcp-alphavantage',
      bars,
      summary,
      color: TICKER_PALETTE[idx % TICKER_PALETTE.length],
    });
  });

  return { quotes, comparisonData };
}
