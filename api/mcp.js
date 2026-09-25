/**
 * MCP Server Handler for /api/mcp
 * Protocol: MCP 2025-11-25 over Streamable HTTP & SSE
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

export const TOOLS_MANIFEST = [
  {
    name: 'af_pf_alloc',
    description:
      'Returns calculated portfolio weights, capital allocations, and risk parity metrics for up to five equities based on historical price volatility. The underlying asset volatility and price data are computed from Twelve Data / Alpha Vantage MCP market data. Use this tool when an agent needs an inverse-volatility balanced portfolio allocation across two to five tickers. It does not provide automated trade execution or order routing to brokerages.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol1: { type: 'string', description: 'Primary stock ticker symbol, e.g. AAPL' },
        symbol2: { type: 'string', description: 'Secondary stock ticker symbol, e.g. MSFT' },
        symbol3: { type: 'string', description: 'Third optional stock ticker symbol, e.g. GOOGL' },
        symbol4: { type: 'string', description: 'Fourth optional stock ticker symbol, e.g. AMZN' },
        symbol5: { type: 'string', description: 'Fifth optional stock ticker symbol, e.g. META' },
      },
      required: ['symbol1', 'symbol2'],
    },
  },
  {
    name: 'af_get_stock_quote',
    description:
      'Returns real-time and recent market quote metrics including current price, day change, daily high, daily low, and volume for a specified MAANG equity. The quote information is read directly from Twelve Data / Alpha Vantage MCP real-time quote services. Use this tool when an agent needs current price and daily price change metrics for META, AAPL, AMZN, NFLX, or GOOGL. It does not provide historical OHLCV chart bars or multi-day time series.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'MAANG stock ticker symbol: META, AAPL, AMZN, NFLX, or GOOGL' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'af_get_stock_history',
    description:
      'Returns historical OHLCV price performance time-series data for a specified stock ticker over a designated timeframe. The historical bar data is read directly from Twelve Data / Alpha Vantage MCP market chart endpoints. Use this tool when an agent needs chronological candlestick or closing price history for asset trend evaluation. It does not stream live order book depth or Level 2 bid-ask spreads.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Stock ticker symbol to retrieve historical data for (e.g. AAPL, META, AMZN, NFLX, GOOGL)' },
        timeframe: { type: 'string', description: 'Historical timeframe interval such as 1D, 5D, 1M, 6M, 1Y, or 5Y' },
      },
      required: ['symbol', 'timeframe'],
    },
  },
  {
    name: 'af_get_company_profile',
    description:
      'Returns company profile details, industry sector classification, exchange listing, and fundamental metrics for a MAANG company. The corporate and trading information is read directly from Twelve Data / Alpha Vantage MCP company profile services. Use this tool when an agent needs business description, sector categorization, or fundamental overview for a MAANG stock. It does not track real-time SEC regulatory filings or insider trade reports.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'MAANG stock ticker symbol: META, AAPL, AMZN, NFLX, or GOOGL' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'af_get_maang_overview',
    description:
      'Returns a consolidated summary matrix of live prices, percentage changes, and key daily trading metrics across all five MAANG stocks. The aggregated matrix is read directly from Twelve Data / Alpha Vantage MCP market quote services. Use this tool when an agent needs a high-level comparative snapshot of all MAANG equities at once. It does not cover non-MAANG equities or macroeconomic treasury yields.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'af_maang_prices',
    description:
      'Returns live and historical price data for a given MAANG stock including Meta, Apple, Amazon, Netflix, and Google. The result comes from upstream market APIs provided by Twelve Data / Alpha Vantage MCP. Use this tool when an agent needs raw OHLC data for analysis. It does not cover non-MAANG stocks or crypto.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'MAANG stock ticker symbol (META, AAPL, AMZN, NFLX, or GOOGL)' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'af_maang_indicators',
    description:
      'Returns calculated technical indicators such as RSI, MACD, SMA50, and SMA200 for a given MAANG stock. The result is computed from upstream market data provided by Twelve Data / Alpha Vantage MCP. Use this tool when an agent needs to detect overbought or oversold conditions or trend shifts. It does not cover fundamental metrics like earnings or revenue.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'MAANG stock ticker symbol (META, AAPL, AMZN, NFLX, or GOOGL)' },
        indicator: { type: 'string', description: 'Technical indicator to calculate: RSI, MACD, SMA50, SMA200, or ALL' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'af_maang_backtest',
    description:
      'Returns backtest results on historical MAANG stock data using a chosen strategy such as SMA crossover, RSI thresholds, or macd_crossover. The result is simulated locally from upstream market data provided by Twelve Data / Alpha Vantage MCP. Use this tool when an agent needs to validate signals historically. It does not cover live trading or execution.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'MAANG stock ticker symbol (META, AAPL, AMZN, NFLX, or GOOGL)' },
        strategy: { type: 'string', description: 'Backtest trading strategy: sma_crossover, rsi_threshold, or macd_crossover' },
      },
      required: ['symbol', 'strategy'],
    },
  },
];

export default async function handler(req, res) {
  // 1. CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // 2. Handle GET and HEAD requests gracefully
  if (req.method === 'GET' || req.method === 'HEAD') {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const query = req.query || Object.fromEntries(urlObj.searchParams.entries());

    // 2a. Query param method=tools/list
    if (query.method === 'tools/list') {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: query.id || 1,
          result: { tools: TOOLS_MANIFEST },
        })
      );
      return;
    }

    // 2b. Query param method=ping
    if (query.method === 'ping') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: query.id || 1, result: {} }));
      return;
    }

    // 2c. Direct tool execution via query param (e.g. ?tool=af_get_stock_quote&symbol=AAPL)
    if (query.tool) {
      res.setHeader('Content-Type', 'application/json');
      try {
        let result;
        const toolName = query.tool;
        if (toolName === 'af_get_stock_quote') {
          result = await getStockQuote(query.symbol || 'AAPL');
        } else if (toolName === 'af_get_stock_history') {
          result = await getStockHistory(query.symbol || 'AAPL', query.timeframe || '1M');
        } else if (toolName === 'af_get_company_profile') {
          result = await getCompanyProfile(query.symbol || 'AAPL');
        } else if (toolName === 'af_get_maang_overview') {
          result = await getMaangOverview();
        } else if (toolName === 'af_maang_prices') {
          result = await getMaangPrices(query.symbol || 'AAPL');
        } else if (toolName === 'af_maang_indicators') {
          result = await getMaangIndicators(query.symbol || 'AAPL', query.indicator || 'ALL');
        } else if (toolName === 'af_maang_backtest') {
          result = await getMaangBacktest(query.symbol || 'AAPL', query.strategy || 'sma_crossover');
        } else if (toolName === 'af_pf_alloc') {
          result = await getPortfolioAllocation({
            symbol1: query.symbol1 || 'AAPL',
            symbol2: query.symbol2 || 'MSFT',
            symbol3: query.symbol3,
            symbol4: query.symbol4,
            symbol5: query.symbol5,
          });
        } else {
          res.statusCode = 404;
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32601, message: `Tool ${toolName} not found` },
              id: query.id || null,
            })
          );
          return;
        }

        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: query.id || 1,
            result: {
              content: [{ type: 'text', text: JSON.stringify(result) }],
            },
          })
        );
        return;
      } catch (err) {
        res.statusCode = err.status || 500;
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: err.message },
            id: query.id || null,
          })
        );
        return;
      }
    }

    // 2d. SSE stream request
    if (req.headers.accept?.includes('text/event-stream')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(`event: endpoint\ndata: ${JSON.stringify({ url: '/api/mcp' })}\n\n`);
      return;
    }

    // 2e. Default GET: Return active server status and tools catalog
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        {
          status: 'online',
          server: 'app-fin-v1-server',
          version: '1.0.0',
          protocol: 'mcp-2025-11-25',
          transport: 'streamable-http',
          description: 'Model Context Protocol (MCP) server for financial market data and portfolio analytics',
          endpoints: {
            rpc: 'POST /api/mcp',
            sse: 'GET /api/mcp (Accept: text/event-stream)',
            query: 'GET /api/mcp?method=tools/list or ?tool=<tool_name>&<param>=<value>',
          },
          supportedMethods: ['initialize', 'tools/list', 'tools/call', 'ping'],
          tools: TOOLS_MANIFEST,
        },
        null,
        2
      )
    );
    return;
  }

  // 3. Handle POST requests via MCP Server
  // If POST body is empty or null, return helpful discovery metadata
  if (!req.body || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        status: 'online',
        server: 'app-fin-v1-server',
        version: '1.0.0',
        message: 'Send a valid JSON-RPC 2.0 object to execute MCP commands (e.g. initialize, tools/list, tools/call)',
        tools: TOOLS_MANIFEST.map((t) => t.name),
      })
    );
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
        'Returns backtest results on historical MAANG stock data using a chosen strategy such as SMA crossover, RSI thresholds, or macd_crossover. The result is simulated locally from upstream market data provided by Twelve Data / Alpha Vantage MCP. Use this tool when an agent needs to validate signals historically. It does not cover live trading or execution.',
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
