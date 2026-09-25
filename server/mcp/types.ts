/**
 * Normalized Market Data & MCP Layer Types
 */

export interface NormalizedBar {
  symbol: string;
  timestamp: string; // ISO 8601 string or YYYY-MM-DD HH:mm:ss
  epochTime: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted_close: number;
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

export type MCPProviderId = 'mcp-alphavantage' | 'mcp-twelvedata';

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

export interface IndicatorConfig {
  smaPeriods: number[]; // e.g. [20, 50, 200]
  emaPeriods: number[]; // e.g. [12, 26, 50]
  bollinger: {
    enabled: boolean;
    period: number;
    stdDevMultiplier: number;
  };
  volatilityWindow: number; // e.g. 20
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
  normalizedPct?: number; // relative to first bar
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

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo';
export type TimeRange = '1D' | '5D' | '1M' | '6M' | '1Y' | 'YTD' | '5Y' | 'MAX';

export type AllocationMethod = 'inverse_volatility' | 'inverse_variance' | 'equal_weight';

export interface PortfolioAllocationItem {
  symbol: string;
  name: string;
  volatility: number;
  weight: number; // percentage 0 to 100, total = 100%
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
