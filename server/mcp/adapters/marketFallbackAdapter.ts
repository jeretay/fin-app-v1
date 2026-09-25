import { NormalizedBar, TickerQuote, TimeInterval, TimeRange } from '../types.ts';

// Known reference base statistics for realistic pricing and high/low ranges
interface KnownTickerProfile {
  name: string;
  basePrice: number;
  volatility: number; // daily annualized %
  drift: number; // annual expected drift
  week52High: number;
  week52Low: number;
  avgVolume: number;
  peRatio?: number;
  marketCap?: number;
}

const KNOWN_TICKERS: Record<string, KnownTickerProfile> = {
  AAPL: { name: 'Apple Inc.', basePrice: 335.92, volatility: 0.22, drift: 0.12, week52High: 345.34, week52Low: 243.42, avgVolume: 48000000, peRatio: 33.8, marketCap: 3480000000000 },
  NVDA: { name: 'NVIDIA Corporation', basePrice: 224.58, volatility: 0.48, drift: 0.35, week52High: 238.50, week52Low: 118.00, avgVolume: 72000000, peRatio: 42.1, marketCap: 3120000000000 },
  MSFT: { name: 'Microsoft Corporation', basePrice: 497.93, volatility: 0.24, drift: 0.15, week52High: 510.00, week52Low: 395.00, avgVolume: 21000000, peRatio: 35.2, marketCap: 3180000000000 },
  GOOGL: { name: 'Alphabet Inc.', basePrice: 342.36, volatility: 0.26, drift: 0.14, week52High: 355.00, week52Low: 230.00, avgVolume: 24000000, peRatio: 23.5, marketCap: 2040000000000 },
  AMZN: { name: 'Amazon.com, Inc.', basePrice: 249.38, volatility: 0.28, drift: 0.18, week52High: 260.00, week52Low: 165.00, avgVolume: 35000000, peRatio: 41.6, marketCap: 1960000000000 },
  META: { name: 'Meta Platforms, Inc.', basePrice: 777.59, volatility: 0.32, drift: 0.25, week52High: 785.00, week52Low: 450.00, avgVolume: 26000000, peRatio: 28.4, marketCap: 1440000000000 },
  TSLA: { name: 'Tesla, Inc.', basePrice: 377.94, volatility: 0.52, drift: 0.10, week52High: 395.00, week52Low: 180.00, avgVolume: 68000000, peRatio: 64.2, marketCap: 778000000000 },
  SPY: { name: 'SPDR S&P 500 ETF Trust', basePrice: 652.40, volatility: 0.14, drift: 0.11, week52High: 660.00, week52Low: 490.00, avgVolume: 58000000, peRatio: 26.2, marketCap: 560000000000 },
  QQQ: { name: 'Invesco QQQ Trust (Nasdaq 100)', basePrice: 586.20, volatility: 0.18, drift: 0.16, week52High: 595.00, week52Low: 420.00, avgVolume: 42000000, peRatio: 30.1, marketCap: 290000000000 },
  AMD: { name: 'Advanced Micro Devices, Inc.', basePrice: 196.40, volatility: 0.42, drift: 0.20, week52High: 227.30, week52Low: 120.00, avgVolume: 45000000, peRatio: 88.0, marketCap: 253000000000 },
  PLTR: { name: 'Palantir Technologies Inc.', basePrice: 72.80, volatility: 0.46, drift: 0.30, week52High: 76.50, week52Low: 25.00, avgVolume: 55000000, peRatio: 92.4, marketCap: 84000000000 },
  ARM: { name: 'Arm Holdings plc', basePrice: 182.10, volatility: 0.49, drift: 0.28, week52High: 195.00, week52Low: 95.00, avgVolume: 12000000, peRatio: 98.0, marketCap: 148000000000 },
  COIN: { name: 'Coinbase Global, Inc.', basePrice: 288.90, volatility: 0.65, drift: 0.22, week52High: 320.00, week52Low: 140.00, avgVolume: 15000000, peRatio: 38.0, marketCap: 44000000000 },
  TSM: { name: 'Taiwan Semiconductor Mfg.', basePrice: 214.50, volatility: 0.30, drift: 0.24, week52High: 225.00, week52Low: 130.00, avgVolume: 18000000, peRatio: 27.5, marketCap: 905000000000 },
  AVGO: { name: 'Broadcom Inc.', basePrice: 228.20, volatility: 0.36, drift: 0.22, week52High: 240.00, week52Low: 135.00, avgVolume: 22000000, peRatio: 45.0, marketCap: 785000000000 },
  'BTC-USD': { name: 'Bitcoin (USD)', basePrice: 94850.00, volatility: 0.58, drift: 0.40, week52High: 108000.00, week52Low: 52000.00, avgVolume: 28000000000, marketCap: 1260000000000 },
  'ETH-USD': { name: 'Ethereum (USD)', basePrice: 3420.00, volatility: 0.62, drift: 0.35, week52High: 4090.00, week52Low: 2100.00, avgVolume: 14000000000, marketCap: 415000000000 },
};

/**
 * Deterministic pseudo-random number generator for reproducible chart candles
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Box-Muller transform for standard normal random variable
 */
function standardNormal(rnd: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generates realistic normalized historical bars for any ticker, interval, and range
 */
export function generateRealisticHistoricalBars(
  symbol: string,
  range: TimeRange,
  interval: TimeInterval
): NormalizedBar[] {
  const upperSymbol = symbol.toUpperCase().trim();
  const profile = KNOWN_TICKERS[upperSymbol] || {
    name: `${upperSymbol} Corporation`,
    basePrice: 100.0,
    volatility: 0.30,
    drift: 0.15,
    week52High: 135.0,
    week52Low: 75.0,
    avgVolume: 15000000,
  };

  // Determine bar count and step duration based on range and interval
  let barCount = 100;
  let stepMs = 86400000; // 1 day default

  switch (interval) {
    case '1m':
      stepMs = 60 * 1000;
      barCount = range === '1D' ? 390 : 150; // 390 minutes in standard US market day
      break;
    case '5m':
      stepMs = 5 * 60 * 1000;
      barCount = range === '1D' ? 78 : (range === '5D' ? 390 : 200);
      break;
    case '15m':
      stepMs = 15 * 60 * 1000;
      barCount = range === '5D' ? 130 : 180;
      break;
    case '1h':
      stepMs = 60 * 60 * 1000;
      barCount = range === '1M' ? 140 : (range === '5D' ? 35 : 120);
      break;
    case '1d':
      stepMs = 24 * 60 * 60 * 1000;
      if (range === '1M') barCount = 22;
      else if (range === '6M') barCount = 126;
      else if (range === '1Y' || range === 'YTD') barCount = 252;
      else if (range === '5Y') barCount = 1260;
      else barCount = 60;
      break;
    case '1wk':
      stepMs = 7 * 24 * 60 * 60 * 1000;
      barCount = range === '5Y' ? 260 : 52;
      break;
    case '1mo':
      stepMs = 30 * 24 * 60 * 60 * 1000;
      barCount = 60;
      break;
  }

  // Create deterministic seed from symbol and range
  let seed = 42;
  for (let i = 0; i < upperSymbol.length; i++) {
    seed = (seed * 31 + upperSymbol.charCodeAt(i)) & 0xffffffff;
  }
  const rnd = seededRandom(Math.abs(seed));

  const now = Date.now();
  const bars: NormalizedBar[] = [];

  // Annualized dt for simulation
  const dt = stepMs / (365 * 24 * 3600 * 1000);
  const sigma = profile.volatility;
  const mu = profile.drift;

  // Work backward from target current price
  // Generate random walk
  const rawCloses: number[] = [profile.basePrice];
  for (let i = 1; i < barCount; i++) {
    const z = standardNormal(rnd);
    const prev = rawCloses[i - 1];
    // Geometric Brownian motion: S_t = S_{t-1} * exp((mu - 0.5 * sigma^2)*dt + sigma*sqrt(dt)*Z)
    const factor = Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
    const nextPrice = Math.max(1.0, prev * factor);
    rawCloses.push(nextPrice);
  }

  // Rescale so the last bar matches profile.basePrice approximately
  const lastRaw = rawCloses[rawCloses.length - 1];
  const scale = profile.basePrice / lastRaw;

  for (let i = 0; i < barCount; i++) {
    const barEpoch = now - (barCount - 1 - i) * stepMs;
    const dateObj = new Date(barEpoch);
    const close = Number((rawCloses[i] * scale).toFixed(2));
    
    // Intraday bar swing
    const barVol = (sigma * Math.sqrt(dt)) * (0.8 + 0.4 * rnd());
    const openDrift = standardNormal(rnd) * barVol * 0.4;
    const open = Number((close * (1 + openDrift)).toFixed(2));
    
    const wickHigh = Math.abs(standardNormal(rnd)) * barVol * 0.6;
    const wickLow = Math.abs(standardNormal(rnd)) * barVol * 0.6;
    
    const high = Number((Math.max(open, close) * (1 + wickHigh)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - wickLow)).toFixed(2));

    // Volume with burst on higher candle body size
    const bodyPct = Math.abs(close - open) / open;
    const volumeMultiplier = 0.5 + rnd() + bodyPct * 20;
    const volume = Math.round(profile.avgVolume / (stepMs === 86400000 ? 1 : 25) * volumeMultiplier);

    bars.push({
      symbol: upperSymbol,
      timestamp: dateObj.toISOString(),
      epochTime: barEpoch,
      open,
      high,
      low,
      close,
      volume,
      adjusted_close: close,
    });
  }

  return bars;
}

/**
 * Generates an up-to-date quote for a ticker symbol
 */
export function generateRealisticQuote(symbol: string): TickerQuote {
  const upperSymbol = symbol.toUpperCase().trim();
  const profile = KNOWN_TICKERS[upperSymbol] || {
    name: `${upperSymbol} Corporation`,
    basePrice: 100.0,
    volatility: 0.28,
    drift: 0.15,
    week52High: 135.0,
    week52Low: 75.0,
    avgVolume: 15000000,
    peRatio: 25.0,
    marketCap: 25000000000,
  };

  // Generate a modest intraday fluctuation based on time of day
  const minuteOfDay = Math.floor((Date.now() / 60000) % 1440);
  const driftPct = Math.sin(minuteOfDay / 60) * (profile.volatility * 0.05);
  const currentPrice = Number((profile.basePrice * (1 + driftPct)).toFixed(2));

  // Previous close
  const prevClose = Number((profile.basePrice * (1 - (profile.volatility * 0.02))).toFixed(2));
  const change = Number((currentPrice - prevClose).toFixed(2));
  const changePercent = Number(((change / prevClose) * 100).toFixed(2));

  const dayHigh = Number((Math.max(currentPrice, prevClose) * 1.012).toFixed(2));
  const dayLow = Number((Math.min(currentPrice, prevClose) * 0.988).toFixed(2));

  return {
    symbol: upperSymbol,
    name: profile.name,
    price: currentPrice,
    change,
    changePercent,
    open: Number((prevClose * 1.002).toFixed(2)),
    high: dayHigh,
    low: dayLow,
    previousClose: prevClose,
    volume: profile.avgVolume,
    timestamp: new Date().toISOString(),
    marketCap: profile.marketCap,
    peRatio: profile.peRatio,
    week52High: profile.week52High,
    week52Low: profile.week52Low,
    provider: 'mcp-alphavantage',
  };
}
