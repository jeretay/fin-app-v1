export type MCPProviderId = 'mcp-yfinance' | 'mcp-alphavantage' | 'mcp-twelvedata' | 'mcp-fallback-cache';

export interface NormalizedBar {
  symbol: string;
  timestamp: string;
  epochTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted_close: number;
}

export interface CalculatedBar extends NormalizedBar {
  sma: Record<number, number | null>;
  ema: Record<number, number | null>;
  bollinger?: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
    bandwidth: number | null;
  };
  rollingStdDev?: number | null;
  normalizedPct?: number;
}

export interface TickerQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  timestamp: string;
  marketCap?: number;
  peRatio?: number;
  week52High: number;
  week52Low: number;
  provider: MCPProviderId;
}

export interface TickerSummaryStats {
  symbol: string;
  name: string;
  currentPrice: number;
  dayChange: number;
  dayChangePct: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  rollingStdDev: number;
  annualizedVolatility: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  maSignal: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
  maSignalDetails: string;
  provider: MCPProviderId;
}

export interface MCPServerStatus {
  id: MCPProviderId;
  name: string;
  transport: 'stdio' | 'sse' | 'http_mcp';
  commandOrUrl: string;
  status: 'connected' | 'simulated' | 'degraded' | 'rate_limited' | 'offline';
  latencyMs: number;
  requestCount: number;
  lastActive: string;
  supportedTools: string[];
}

export interface IndicatorSettings {
  showSma20: boolean;
  showSma50: boolean;
  showSma200: boolean;
  showEma12: boolean;
  showEma26: boolean;
  showBollinger: boolean;
  bollingerPeriod: number;
  bollingerMultiplier: number;
  volatilityWindow: number;
  showVolume: boolean;
}

export type ChartMode = 'candlestick' | 'comparison';
export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo';
export type TimeRange = '1D' | '5D' | '1M' | '6M' | '1Y' | 'YTD' | '5Y';

export interface ComparisonDataset {
  symbol: string;
  quote: TickerQuote;
  provider: MCPProviderId;
  bars: CalculatedBar[];
  summary: TickerSummaryStats;
  color: string;
}

export type AllocationMethod = 'inverse_volatility' | 'inverse_variance' | 'equal_weight';

export interface PortfolioAllocationItem {
  symbol: string;
  name: string;
  volatility: number;
  weight: number; // percentage 0 to 100, exact sum = 100.00%
  allocatedCapital: number;
  sharesToBuy: number;
  currentPrice: number;
  color: string;
}

export interface PortfolioAllocationSummary {
  method: AllocationMethod;
  totalCapital: number;
  allocations: PortfolioAllocationItem[];
  weightedPortfolioVolatility: number;
  diversificationBenefitPct: number;
}

export const TICKER_PALETTE: string[] = [
  '#38bdf8', // Sky 400 (Electric Blue)
  '#f59e0b', // Amber 500 (Gold)
  '#10b981', // Emerald 500 (Mint Green)
  '#ec4899', // Pink 500 (Hot Pink)
  '#8b5cf6', // Violet 500 (Purple)
];
