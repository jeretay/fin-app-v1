import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MCPClientManager } from './server/mcp/MCPClientManager.ts';
import {
  calculatePortfolioAllocation,
  enrichBarsWithIndicators,
  evaluateMASignals,
} from './server/analytics/engine.ts';
import {
  generateClaudeDesktopConfig,
  generateNodeSDKClientScript,
  generatePythonFastMCPScript,
} from './server/mcp/configGenerator.ts';
import { IndicatorConfig, TimeInterval, TimeRange } from './server/mcp/types.ts';
import mcpHandler from './api/mcp.js';
import {
  getStockQuote,
  getStockHistory,
  getCompanyProfile,
  getMaangOverview,
  getMaangPrices,
  getMaangIndicators,
  getMaangBacktest,
  getPortfolioAllocation,
} from './lib/marketService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// ==========================================
// MCP Protocol Endpoint
// ==========================================
app.all('/api/mcp', mcpHandler);

// ==========================================
// Data Routes wrapped by MCP tools
// ==========================================
app.all('/api/portfolio-allocation', async (req: Request, res: Response) => {
  try {
    const symbol1 = (req.query.symbol1 as string) || req.body?.symbol1;
    const symbol2 = (req.query.symbol2 as string) || req.body?.symbol2;
    const symbol3 = (req.query.symbol3 as string) || req.body?.symbol3;
    const symbol4 = (req.query.symbol4 as string) || req.body?.symbol4;
    const symbol5 = (req.query.symbol5 as string) || req.body?.symbol5;
    const result = await getPortfolioAllocation({ symbol1, symbol2, symbol3, symbol4, symbol5 });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks/quote', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'AAPL';
    const result = await getStockQuote(symbol);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks/history', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'AAPL';
    const timeframe = (req.query.timeframe as string) || '1M';
    const result = await getStockHistory(symbol, timeframe);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks/profile', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'AAPL';
    const result = await getCompanyProfile(symbol);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks/overview', async (_req: Request, res: Response) => {
  try {
    const result = await getMaangOverview();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.get('/api/stocks', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'AAPL';
    const result = await getMaangPrices(symbol);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.get('/api/indicators', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'AAPL';
    const indicator = (req.query.indicator as string) || 'ALL';
    const result = await getMaangIndicators(symbol, indicator);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.get('/api/backtest', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'AAPL';
    const strategy = (req.query.strategy as string) || 'sma_crossover';
    const result = await getMaangBacktest(symbol, strategy);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

const mcpManager = new MCPClientManager();

// ==========================================
// 1. API: Real-time Quote for single or multiple symbols
// ==========================================
app.get('/api/market/quote', async (req: Request, res: Response) => {
  try {
    const symbolsParam = (req.query.symbols as string) || (req.query.symbol as string) || 'AAPL';
    const symbols = symbolsParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 10);

    if (symbols.length === 1) {
      const quote = await mcpManager.getQuote(symbols[0]);
      res.json({ success: true, data: quote });
    } else {
      const quotes = await mcpManager.getBatchQuotes(symbols);
      res.json({ success: true, data: quotes });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch quote' });
  }
});

// ==========================================
// 2. API: Historical OHLCV + Technical Metrics
// ==========================================
app.get('/api/market/history', async (req: Request, res: Response) => {
  try {
    const symbol = ((req.query.symbol as string) || 'AAPL').toUpperCase().trim();
    const range = ((req.query.range as string) || '1M') as TimeRange;
    const interval = ((req.query.interval as string) || '1d') as TimeInterval;

    // Parse technical indicators config
    const smaParam = (req.query.sma as string) || '20,50,200';
    const emaParam = (req.query.ema as string) || '12,26';
    const bbPeriod = parseInt((req.query.bbPeriod as string) || '20', 10);
    const bbStdDev = parseFloat((req.query.bbStdDev as string) || '2.0');
    const bbEnabled = req.query.bbEnabled !== 'false';
    const volWindow = parseInt((req.query.volWindow as string) || '20', 10);

    const smaPeriods = smaParam
      .split(',')
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const emaPeriods = emaParam
      .split(',')
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const indicatorConfig: IndicatorConfig = {
      smaPeriods: smaPeriods.length > 0 ? smaPeriods : [20, 50, 200],
      emaPeriods: emaPeriods.length > 0 ? emaPeriods : [12, 26],
      bollinger: {
        enabled: bbEnabled,
        period: bbPeriod,
        stdDevMultiplier: bbStdDev,
      },
      volatilityWindow: volWindow,
    };

    const { bars, providerUsed } = await mcpManager.getHistoricalBars(symbol, range, interval);
    const enrichedBars = enrichBarsWithIndicators(bars, indicatorConfig);

    res.json({
      success: true,
      data: {
        symbol,
        range,
        interval,
        provider: providerUsed,
        barCount: enrichedBars.length,
        bars: enrichedBars,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch history' });
  }
});

// ==========================================
// 3. API: Multi-Ticker Normalized Comparison & Matrix
// ==========================================
app.post('/api/market/compare', async (req: Request, res: Response) => {
  try {
    const { symbols = ['AAPL', 'NVDA', 'MSFT'], range = '1M', interval = '1d' } = req.body;
    const cleanSymbols: string[] = (symbols as string[])
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 5); // Limit to 5 simultaneous tickers

    if (cleanSymbols.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one ticker symbol is required' });
    }

    const defaultIndicators: IndicatorConfig = {
      smaPeriods: [20, 50, 200],
      emaPeriods: [12, 26],
      bollinger: { enabled: true, period: 20, stdDevMultiplier: 2.0 },
      volatilityWindow: 20,
    };

    // Parallel fetch for each ticker
    const tickerDatasets = await Promise.all(
      cleanSymbols.map(async (sym) => {
        const quote = await mcpManager.getQuote(sym);
        const { bars, providerUsed } = await mcpManager.getHistoricalBars(
          sym,
          range as TimeRange,
          interval as TimeInterval
        );
        const enriched = enrichBarsWithIndicators(bars, defaultIndicators);

        // Calculate summary stats
        const lastBar = enriched[enriched.length - 1];
        const lastStdDev = lastBar?.rollingStdDev ?? 0;
        const annualizedVol = Number((lastStdDev * Math.sqrt(252)).toFixed(2));

        const lastSma20 = lastBar?.sma?.[20] ?? null;
        const lastSma50 = lastBar?.sma?.[50] ?? null;
        const lastSma200 = lastBar?.sma?.[200] ?? null;

        const maSignals = evaluateMASignals(
          quote.price,
          lastSma20,
          lastSma50,
          lastSma200
        );

        return {
          symbol: sym,
          quote,
          provider: providerUsed,
          bars: enriched,
          summary: {
            symbol: sym,
            name: quote.name,
            currentPrice: quote.price,
            dayChange: quote.change,
            dayChangePct: quote.changePercent,
            dayHigh: quote.high,
            dayLow: quote.low,
            week52High: quote.week52High,
            week52Low: quote.week52Low,
            rollingStdDev: lastStdDev,
            annualizedVolatility: annualizedVol,
            sma20: lastSma20,
            sma50: lastSma50,
            sma200: lastSma200,
            maSignal: maSignals.signal,
            maSignalDetails: maSignals.details,
            provider: providerUsed,
          },
        };
      })
    );

    // Compute Volatility-Based Portfolio Allocation (100% Total)
    const colors = ['#38bdf8', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
    const allocationItems = tickerDatasets.map((t, idx) => ({
      symbol: t.symbol,
      name: t.quote.name,
      volatility: t.summary.annualizedVolatility || t.summary.rollingStdDev * Math.sqrt(252) || 25,
      currentPrice: t.quote.price,
      color: colors[idx % colors.length],
    }));
    const portfolioAllocation = calculatePortfolioAllocation(allocationItems, 'inverse_volatility', 100000);

    res.json({
      success: true,
      data: {
        range,
        interval,
        tickers: tickerDatasets,
        portfolioAllocation,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to compare tickers' });
  }
});

// ==========================================
// 4. API: MCP Server Diagnostics & Transports
// ==========================================
app.get('/api/mcp/status', (_req: Request, res: Response) => {
  const statuses = mcpManager.getAllServerStatuses();
  const preferred = mcpManager.getPreferredProvider();
  res.json({
    success: true,
    data: {
      servers: statuses,
      preferredProvider: preferred,
      activeTransportSummary: {
        stdioCount: statuses.filter((s) => s.transport === 'stdio').length,
        sseCount: statuses.filter((s) => s.transport === 'sse').length,
        httpCount: statuses.filter((s) => s.transport === 'http_mcp').length,
      },
    },
  });
});

app.post('/api/mcp/preference', (req: Request, res: Response) => {
  const { provider } = req.body;
  mcpManager.setPreferredProvider(provider);
  res.json({ success: true, preferred: provider });
});

app.post('/api/mcp/simulate-failover', (req: Request, res: Response) => {
  const { provider } = req.body;
  const isFailing = mcpManager.toggleSimulateFailure(provider);
  res.json({
    success: true,
    provider,
    isSimulatingFailure: isFailing,
    message: isFailing
      ? `Simulating outage / rate-limit for ${provider}. Incoming queries will automatically failover to alternate MCP providers.`
      : `Restored ${provider} back to normal operation.`,
  });
});

// ==========================================
// 5. API: MCP Setup Scripts & Configuration Snippets
// ==========================================
app.get('/api/mcp/config', (_req: Request, res: Response) => {
  const claudeConfig = generateClaudeDesktopConfig();
  const nodeScript = generateNodeSDKClientScript();
  const pythonScript = generatePythonFastMCPScript();

  res.json({
    success: true,
    data: {
      claudeDesktopConfig: claudeConfig,
      nodeSDKScript: nodeScript,
      pythonFastMCPScript: pythonScript,
    },
  });
});

// ==========================================
// 6. Vite / Static Handler
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TickerPulse] Full-stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
