import { MCPProviderId, NormalizedBar, TickerQuote, TimeInterval, TimeRange } from '../types.ts';
import { fetchLiveMarketBars, fetchLiveMarketQuote } from '../marketDataService.ts';

/**
 * Adapter for Twelve Data & Financial Modeling Prep MCP Servers
 * Enterprise quotes, extended fundamentals, and fallback time-series.
 */
export class TwelveDataMCPAdapter {
  readonly id: MCPProviderId = 'mcp-twelvedata';
  readonly name = 'Twelve Data / FMP MCP (twelvedata-mcp)';
  readonly transport = 'sse' as const;
  readonly command = 'https://api.twelvedata.com/mcp-sse';
  private requestCount = 0;
  private lastActive = new Date().toISOString();
  private status: 'connected' | 'simulated' | 'degraded' | 'offline' = 'connected';
  private latencyMs = 42;

  readonly supportedTools = [
    'twelvedata_time_series',
    'twelvedata_quote',
    'twelvedata_technical_indicator',
    'fmp_market_capitalization',
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
      const quote = await fetchLiveMarketQuote(symbol, 'mcp-twelvedata');
      this.latencyMs = Date.now() - startTime;
      this.status = 'connected';
      return {
        ...quote,
        provider: 'mcp-twelvedata',
      };
    } catch (err) {
      this.latencyMs = Date.now() - startTime;
      this.status = 'degraded';
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
    return await fetchLiveMarketBars(symbol, range, interval, 'mcp-twelvedata');
  }
}

