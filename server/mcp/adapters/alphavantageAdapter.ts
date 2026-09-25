import { MCPProviderId, NormalizedBar, TickerQuote, TimeInterval, TimeRange } from '../types.ts';
import { fetchLiveMarketBars, fetchLiveMarketQuote } from '../marketDataService.ts';

/**
 * Adapter for Alpha Vantage MCP Server (alphavantage-mcp)
 * Provides high-frequency intraday intervals and technical indicator metrics.
 */
export class AlphaVantageMCPAdapter {
  readonly id: MCPProviderId = 'mcp-alphavantage';
  readonly name = 'Alpha Vantage MCP (alphavantage-mcp)';
  readonly transport = 'stdio' as const;
  readonly command = 'npx -y @modelcontextprotocol/server-alphavantage';
  private requestCount = 0;
  private lastActive = new Date().toISOString();
  private status: 'connected' | 'simulated' | 'rate_limited' | 'offline' = 'connected';
  private latencyMs = 35;
  private apiKey = process.env.ALPHAVANTAGE_API_KEY || 'demo';

  readonly supportedTools = [
    'alphavantage_TIME_SERIES_INTRADAY',
    'alphavantage_TIME_SERIES_DAILY',
    'alphavantage_GLOBAL_QUOTE',
    'alphavantage_SMA',
    'alphavantage_EMA',
    'alphavantage_BBANDS',
    'alphavantage_RSI',
  ];

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      transport: this.transport,
      commandOrUrl: this.command,
      status: this.status,
      latencyMs: this.latencyMs,
      requestCount: this.requestCount,
      lastActive: this.lastActive,
      supportedTools: this.supportedTools,
    };
  }

  async getQuote(symbol: string): Promise<TickerQuote> {
    const startTime = Date.now();
    this.requestCount++;
    this.lastActive = new Date().toISOString();

    try {
      const quote = await fetchLiveMarketQuote(symbol, 'mcp-alphavantage');
      this.latencyMs = Date.now() - startTime;
      this.status = 'connected';
      return {
        ...quote,
        provider: 'mcp-alphavantage',
      };
    } catch (err) {
      this.latencyMs = Date.now() - startTime;
      this.status = 'rate_limited';
      throw err;
    }
  }

  async getHistoricalBars(
    symbol: string,
    range: TimeRange,
    interval: TimeInterval
  ): Promise<NormalizedBar[]> {
    this.requestCount++;
    this.lastActive = new Date().toISOString();
    return await fetchLiveMarketBars(symbol, range, interval, 'mcp-alphavantage');
  }
}

