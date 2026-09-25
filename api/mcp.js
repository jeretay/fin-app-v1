/**
 * MCP Server Handler for /api/mcp
 * Protocol: MCP 2025-11-25 over Streamable HTTP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import {
  getStockQuote,
  getStockHistory,
  getCompanyProfile,
  getMaangOverview,
  getMaangPrices,
  getMaangIndicators,
  getMaangBacktest,
  getPortfolioAllocation,
} from '../lib/marketService.js';

export default async function handler(req, res) {
  // if (req.method !== 'POST') {
  //   const errorPayload = {
  //     jsonrpc: '2.0',
  //     error: {
  //       code: -32000,
  //       message: 'Method not allowed',
  //     },
  //     id: null,
    };

    if (typeof res.status === 'function') {
      res.status(405);
      if (typeof res.json === 'function') {
        res.json(errorPayload);
        return;
      }
    } else {
      res.statusCode = 405;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(errorPayload));
    return;
  }

  // Fresh server instance per request (stateless sessionless architecture)
  const server = new McpServer({
    name: 'app-fin-v1-server',
    version: '1.0.0',
  });

  // 1. af_pf_alloc
  server.registerTool(
    'af_pf_alloc',
    {
      description:
        'Returns calculated portfolio weights, capital allocations, and risk parity metrics for up to five equities based on historical price volatility. The underlying asset volatility and price data are computed from Twelve Data / Alpha Vantage MCP market data. Use this tool when an agent needs an inverse-volatility balanced portfolio allocation across two to five tickers. It does not provide automated trade execution or order routing to brokerages.',
      inputSchema: {
        symbol1: z.string().describe('Primary stock ticker symbol, e.g. AAPL'),
        symbol2: z.string().describe('Secondary stock ticker symbol, e.g. MSFT'),
        symbol3: z.string().optional().describe('Third optional stock ticker symbol, e.g. GOOGL'),
        symbol4: z.string().optional().describe('Fourth optional stock ticker symbol, e.g. AMZN'),
        symbol5: z.string().optional().describe('Fifth optional stock ticker symbol, e.g. META'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ symbol1, symbol2, symbol3, symbol4, symbol5 }) => {
      try {
        const result = await getPortfolioAllocation({ symbol1, symbol2, symbol3, symbol4, symbol5 });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const status = error.status || 502;
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to calculate portfolio allocation from Twelve Data / Alpha Vantage MCP upstream with status ${status}.`,
            },
          ],
        };
      }
    }
  );

  // 2. af_get_stock_quote
  server.registerTool(
    'af_get_stock_quote',
    {
      description:
        'Returns real-time and recent market quote metrics including current price, day change, daily high, daily low, and volume for a specified MAANG equity. The quote information is read directly from Twelve Data / Alpha Vantage MCP real-time quote services. Use this tool when an agent needs current price and daily price change metrics for META, AAPL, AMZN, NFLX, or GOOGL. It does not provide historical OHLCV chart bars or multi-day time series.',
      inputSchema: {
        symbol: z.string().describe('MAANG stock ticker symbol: META, AAPL, AMZN, NFLX, or GOOGL'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ symbol }) => {
      try {
        const result = await getStockQuote(symbol);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const status = error.status || 502;
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to fetch stock quote for ${symbol} from Twelve Data / Alpha Vantage MCP upstream with status ${status}.`,
            },
          ],
        };
      }
    }
  );

  // 3. af_get_stock_history
  server.registerTool(
    'af_get_stock_history',
    {
      description:
        'Returns historical OHLCV price performance time-series data for a specified stock ticker over a designated timeframe. The historical bar data is read directly from Twelve Data / Alpha Vantage MCP market chart endpoints. Use this tool when an agent needs chronological candlestick or closing price history for asset trend evaluation. It does not stream live order book depth or Level 2 bid-ask spreads.',
      inputSchema: {
        symbol: z.string().describe('Stock ticker symbol to retrieve historical data for (e.g. AAPL, META, AMZN, NFLX, GOOGL)'),
        timeframe: z.string().describe('Historical timeframe interval such as 1D, 5D, 1M, 6M, 1Y, or 5Y'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ symbol, timeframe }) => {
      try {
        const result = await getStockHistory(symbol, timeframe);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const status = error.status || 502;
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to fetch stock history for ${symbol} over timeframe ${timeframe} from Twelve Data / Alpha Vantage MCP upstream with status ${status}.`,
            },
          ],
        };
      }
    }
  );

  // 4. af_get_company_profile
  server.registerTool(
    'af_get_company_profile',
    {
      description:
        'Returns company profile details, industry sector classification, exchange listing, and fundamental metrics for a MAANG company. The corporate and trading information is read directly from Twelve Data / Alpha Vantage MCP company profile services. Use this tool when an agent needs business description, sector categorization, or fundamental overview for a MAANG stock. It does not track real-time SEC regulatory filings or insider trade reports.',
      inputSchema: {
        symbol: z.string().describe('MAANG stock ticker symbol: META, AAPL, AMZN, NFLX, or GOOGL'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ symbol }) => {
      try {
        const result = await getCompanyProfile(symbol);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const status = error.status || 502;
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to fetch company profile for ${symbol} from Twelve Data / Alpha Vantage MCP upstream with status ${status}.`,
            },
          ],
        };
      }
    }
  );

  // 5. af_get_maang_overview
  server.registerTool(
    'af_get_maang_overview',
    {
      description:
        'Returns a consolidated summary matrix of live prices, percentage changes, and key daily trading metrics across all five MAANG stocks. The aggregated matrix is read directly from Twelve Data / Alpha Vantage MCP market quote services. Use this tool when an agent needs a high-level comparative snapshot of all MAANG equities at once. It does not cover non-MAANG equities or macroeconomic treasury yields.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const result = await getMaangOverview();
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const status = error.status || 502;
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to fetch MAANG overview from Twelve Data / Alpha Vantage MCP upstream with status ${status}.`,
            },
          ],
        };
      }
    }
  );

  // 6. af_maang_prices
  server.registerTool(
    'af_maang_prices',
    {
      description:
        'Returns live and historical price data for a given MAANG stock including Meta, Apple, Amazon, Netflix, and Google. The result comes from upstream market APIs provided by Twelve Data / Alpha Vantage MCP. Use this tool when an agent needs raw OHLC data for analysis. It does not cover non-MAANG stocks or crypto.',
      inputSchema: {
        symbol: z.string().describe('MAANG stock ticker symbol (META, AAPL, AMZN, NFLX, or GOOGL)'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ symbol }) => {
      try {
        const result = await getMaangPrices(symbol);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const status = error.status || 502;
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to fetch MAANG prices for ${symbol} from Twelve Data / Alpha Vantage MCP upstream with status ${status}.`,
            },
          ],
        };
      }
    }
  );

  // 7. af_maang_indicators
  server.registerTool(
    'af_maang_indicators',
    {
      description:
        'Returns calculated technical indicators such as RSI, MACD, SMA50, and SMA200 for a given MAANG stock. The result is computed from upstream market data provided by Twelve Data / Alpha Vantage MCP. Use this tool when an agent needs to detect overbought or oversold conditions or trend shifts. It does not cover fundamental metrics like earnings or revenue.',
      inputSchema: {
        symbol: z.string().describe('MAANG stock ticker symbol (META, AAPL, AMZN, NFLX, or GOOGL)'),
        indicator: z.string().describe('Technical indicator to calculate: RSI, MACD, SMA50, SMA200, or ALL'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ symbol, indicator }) => {
      try {
        const result = await getMaangIndicators(symbol, indicator);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const status = error.status || 502;
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to calculate ${indicator} technical indicator for ${symbol} from Twelve Data / Alpha Vantage MCP upstream with status ${status}.`,
            },
          ],
        };
      }
    }
  );

  // 8. af_maang_backtest
  server.registerTool(
    'af_maang_backtest',
    {
      description:
        'Returns backtest results on historical MAANG stock data using a chosen strategy such as SMA crossover, RSI thresholds, or MACD crossover. The result is simulated locally from upstream market data provided by Twelve Data / Alpha Vantage MCP. Use this tool when an agent needs to validate signals historically. It does not cover live trading or execution.',
      inputSchema: {
        symbol: z.string().describe('MAANG stock ticker symbol (META, AAPL, AMZN, NFLX, or GOOGL)'),
        strategy: z.string().describe('Backtest trading strategy: sma_crossover, rsi_threshold, or macd_crossover'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ symbol, strategy }) => {
      try {
        const result = await getMaangBacktest(symbol, strategy);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const status = error.status || 502;
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to execute ${strategy} backtest for ${symbol} from Twelve Data / Alpha Vantage MCP upstream with status ${status}.`,
            },
          ],
        };
      }
    }
  );

  // Fresh transport instance per request
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  // Ensure clean teardown when response closes
  res.on('close', () => {
    try {
      transport.close();
    } catch {}
    try {
      server.close();
    } catch {}
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
