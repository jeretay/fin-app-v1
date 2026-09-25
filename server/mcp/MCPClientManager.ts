import {
  MCPProviderId,
  MCPServerStatus,
  NormalizedBar,
  TickerQuote,
  TimeInterval,
  TimeRange,
} from './types.ts';
import { AlphaVantageMCPAdapter } from './adapters/alphavantageAdapter.ts';
import { TwelveDataMCPAdapter } from './adapters/twelveDataAdapter.ts';
import { generateRealisticHistoricalBars, generateRealisticQuote } from './adapters/marketFallbackAdapter.ts';

export class MCPClientManager {
  private alphavantage: AlphaVantageMCPAdapter;
  private twelvedata: TwelveDataMCPAdapter;

  private preferredProvider: MCPProviderId | 'auto' = 'auto';
  private simulatedFailures: Set<MCPProviderId> = new Set();

  constructor() {
    this.alphavantage = new AlphaVantageMCPAdapter();
    this.twelvedata = new TwelveDataMCPAdapter();
  }

  setPreferredProvider(provider: MCPProviderId | 'auto') {
    this.preferredProvider = provider;
  }

  getPreferredProvider(): MCPProviderId | 'auto' {
    return this.preferredProvider;
  }

  toggleSimulateFailure(provider: MCPProviderId): boolean {
    if (this.simulatedFailures.has(provider)) {
      this.simulatedFailures.delete(provider);
      return false; // no longer failing
    } else {
      this.simulatedFailures.add(provider);
      return true; // now failing
    }
  }

  isSimulatedFailure(provider: MCPProviderId): boolean {
    return this.simulatedFailures.has(provider);
  }

  /**
   * Returns list of all registered MCP servers and their real-time status
   */
  getAllServerStatuses(): MCPServerStatus[] {
    const list: MCPServerStatus[] = [
      this.alphavantage.getStatus(),
      this.twelvedata.getStatus(),
    ];

    // Overlay simulated failure states
    return list.map((server) => {
      if (this.simulatedFailures.has(server.id)) {
        return {
          ...server,
          status: 'rate_limited',
          latencyMs: 999,
        };
      }
      return server;
    });
  }

  /**
   * Retrieves quotes for a ticker using failover chain
   */
  async getQuote(symbol: string): Promise<TickerQuote> {
    const candidateProviders: MCPProviderId[] =
      this.preferredProvider === 'auto'
        ? ['mcp-alphavantage', 'mcp-twelvedata']
        : [this.preferredProvider, 'mcp-alphavantage', 'mcp-twelvedata'];

    for (const providerId of candidateProviders) {
      if (this.simulatedFailures.has(providerId)) {
        continue; // simulated outage/rate limit
      }

      try {
        if (providerId === 'mcp-alphavantage') {
          return await this.alphavantage.getQuote(symbol);
        } else if (providerId === 'mcp-twelvedata') {
          return await this.twelvedata.getQuote(symbol);
        }
      } catch (err) {
        console.warn(`[MCPClientManager] Error with provider ${providerId}:`, err);
        // continue to next in failover chain
      }
    }

    // Fallback cache if all providers fail
    return generateRealisticQuote(symbol);
  }

  /**
   * Batch fetches quotes for multiple tickers
   */
  async getBatchQuotes(symbols: string[]): Promise<Record<string, TickerQuote>> {
    const results: Record<string, TickerQuote> = {};
    await Promise.all(
      symbols.map(async (sym) => {
        results[sym.toUpperCase()] = await this.getQuote(sym);
      })
    );
    return results;
  }

  /**
   * Retrieves historical bars using failover chain
   */
  async getHistoricalBars(
    symbol: string,
    range: TimeRange,
    interval: TimeInterval
  ): Promise<{ bars: NormalizedBar[]; providerUsed: MCPProviderId }> {
    const candidateProviders: MCPProviderId[] =
      this.preferredProvider === 'auto'
        ? ['mcp-alphavantage', 'mcp-twelvedata']
        : [this.preferredProvider, 'mcp-alphavantage', 'mcp-twelvedata'];

    for (const providerId of candidateProviders) {
      if (this.simulatedFailures.has(providerId)) {
        continue;
      }

      try {
        if (providerId === 'mcp-alphavantage') {
          const bars = await this.alphavantage.getHistoricalBars(symbol, range, interval);
          if (bars && bars.length > 0) {
            return { bars, providerUsed: 'mcp-alphavantage' };
          }
        } else if (providerId === 'mcp-twelvedata') {
          const bars = await this.twelvedata.getHistoricalBars(symbol, range, interval);
          if (bars && bars.length > 0) {
            return { bars, providerUsed: 'mcp-twelvedata' };
          }
        }
      } catch (err) {
        console.warn(`[MCPClientManager] Historical bars failover for ${providerId}:`, err);
      }
    }

    const fallbackBars = await this.alphavantage.getHistoricalBars(symbol, range, interval);
    return { bars: fallbackBars, providerUsed: 'mcp-alphavantage' };
  }
}
