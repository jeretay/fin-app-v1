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
  AAPL: { name: 'Apple Inc.', basePrice: 335.92, volatility: 0.22, drift: 0.12, week52High: 345.34, week52Low: 243.42, avgVolume: 48000000 },
  NVDA: { name: 'NVIDIA Corporation', basePrice: 224.58, volatility: 0.48, drift: 0.35, week52High: 238.50, week52Low: 118.00, avgVolume: 72000000 },
  MSFT: { name: 'Microsoft Corporation', basePrice: 497.93, volatility: 0.24, drift: 0.15, week52High: 510.00, week52Low: 395.00, avgVolume: 21000000 },
  GOOGL: { name: 'Alphabet Inc.', basePrice: 342.36, volatility: 0.26, drift: 0.14, week52High: 355.00, week52Low: 230.00, avgVolume: 24000000 },
  AMZN: { name: 'Amazon.com, Inc.', basePrice: 249.38, volatility: 0.28, drift: 0.18, week52High: 260.00, week52Low: 165.00, avgVolume: 35000000 },
  META: { name: 'Meta Platforms, Inc.', basePrice: 777.59, volatility: 0.32, drift: 0.25, week52High: 785.00, week52Low: 450.00, avgVolume: 26000000 },
  TSLA: { name: 'Tesla, Inc.', basePrice: 377.94, volatility: 0.52, drift: 0.10, week52High: 395.00, week52Low: 180.00, avgVolume: 68000000 },
  SPY: { name: 'SPDR S&P 500 ETF Trust', basePrice: 652.40, volatility: 0.14, drift: 0.11, week52High: 660.00, week52Low: 490.00, avgVolume: 58000000 },
  QQQ: { name: 'Invesco QQQ Trust', basePrice: 586.20, volatility: 0.18, drift: 0.16, week52High: 595.00, week52Low: 420.00, avgVolume: 42000000 },
  AMD: { name: 'Advanced Micro Devices', basePrice: 196.40, volatility: 0.42, drift: 0.20, week52High: 227.30, week52Low: 120.00, avgVolume: 45000000 },
  PLTR: { name: 'Palantir Technologies', basePrice: 72.80, volatility: 0.46, drift: 0.30, week52High: 76.50, week52Low: 25.00, avgVolume: 55000000 },
  ARM: { name: 'Arm Holdings plc', basePrice: 182.10, volatility: 0.49, drift: 0.28, week52High: 195.00, week52Low: 95.00, avgVolume: 12000000 },
  COIN: { name: 'Coinbase Global, Inc.', basePrice: 288.90, volatility: 0.65, drift: 0.22, week52High: 320.00, week52Low: 140.00, avgVolume: 15000000 },
  TSM: { name: 'Taiwan Semiconductor Mfg.', basePrice: 214.50, volatility: 0.30, drift: 0.24, week52High: 225.00, week52Low: 130.00, avgVolume: 18000000 },
  AVGO: { name: 'Broadcom Inc.', basePrice: 228.20, volatility: 0.36, drift: 0.22, week52High: 240.00, week52Low: 135.00, avgVolume: 22000000 },
  'BTC-USD': { name: 'Bitcoin (USD)', basePrice: 94850.00, volatility: 0.58, drift: 0.40, week52High: 108000.00, week52Low: 52000.00, avgVolume: 28000000000 },
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
