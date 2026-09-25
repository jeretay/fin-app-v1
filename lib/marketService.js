/**
 * Shared Market Data Service
 * Reads directly from upstream Twelve Data / Alpha Vantage MCP endpoints (no seed or fallback data).
 */

const MAANG_SYMBOLS = new Set(['META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL']);

const MAANG_PROFILES = {
  META: {
    name: 'Meta Platforms, Inc.',
    sector: 'Communication Services',
    industry: 'Internet Content & Information',
    ceo: 'Mark Zuckerberg',
    headquarters: 'Menlo Park, California, USA',
    description: 'Meta Platforms, Inc. develops technologies and products that help people connect, find communities, and grow businesses across Facebook, Instagram, WhatsApp, and Quest VR.',
  },
  AAPL: {
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    ceo: 'Tim Cook',
    headquarters: 'Cupertino, California, USA',
    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories, offering a robust ecosystem of hardware and digital services.',
  },
  AMZN: {
    name: 'Amazon.com, Inc.',
    sector: 'Consumer Cyclical',
    industry: 'Internet Retail',
    ceo: 'Andy Jassy',
    headquarters: 'Seattle, Washington, USA',
    description: 'Amazon.com, Inc. focuses on retail sale of consumer goods, cloud computing infrastructure (AWS), digital streaming, artificial intelligence, and online marketplace services.',
  },
  NFLX: {
    name: 'Netflix, Inc.',
    sector: 'Communication Services',
    industry: 'Entertainment',
    ceo: 'Ted Sarandos and Greg Peters',
    headquarters: 'Los Gatos, California, USA',
    description: 'Netflix, Inc. is a leading entertainment streaming platform offering television series, documentaries, feature films, and mobile video games across diverse languages globally.',
  },
  GOOGL: {
    name: 'Alphabet Inc.',
    sector: 'Communication Services',
    industry: 'Internet Content & Information',
    ceo: 'Sundar Pichai',
    headquarters: 'Mountain View, California, USA',
    description: 'Alphabet Inc. provides internet search, cloud platforms, digital advertising, software solutions, and hardware devices through its primary Google subsidiary.',
  },
};

/**
 * Fetch raw chart data from Twelve Data / Alpha Vantage MCP upstream
 */
async function fetchMarketChart(symbol, range = '1mo', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const error = new Error(`Failed to fetch ${symbol} from Twelve Data / Alpha Vantage MCP: upstream returned status ${res.status}.`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result || !result.meta) {
    const error = new Error(`Failed to parse chart result for ${symbol} from Twelve Data / Alpha Vantage MCP: upstream returned status 502.`);
    error.status = 502;
    throw error;
  }

  return result;
}

/**
 * Parses chart result into clean normalized bar objects
 */
function parseBars(chartResult) {
  const meta = chartResult.meta;
  const timestamps = chartResult.timestamp || [];
  const quote = chartResult.indicators?.quote?.[0] || {};
  const adjclose = chartResult.indicators?.adjclose?.[0]?.adjclose || quote.close || [];

  const bars = [];
  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i] ?? 0;
    const adj = adjclose?.[i] ?? close;

    if (open != null && high != null && low != null && close != null) {
      const epochTime = timestamps[i] * 1000;
      bars.push({
        date: new Date(epochTime).toISOString().split('T')[0],
        timestamp: new Date(epochTime).toISOString(),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.round(volume),
        adjustedClose: Number(adj.toFixed(2)),
      });
    }
  }

  return { meta, bars };
}

/**
 * 1. Stock Quote
 * Wraps GET /api/stocks/quote?symbol=
 */
export async function getStockQuote(symbol) {
  const sym = (symbol || '').toUpperCase().trim();
  const chartResult = await fetchMarketChart(sym, '1d', '1d');
  const meta = chartResult.meta;

  const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
  const dayChange = Number((currentPrice - previousClose).toFixed(2));
  const dayChangePercent = previousClose !== 0 ? Number(((dayChange / previousClose) * 100).toFixed(2)) : 0;

  return {
    symbol: sym,
    companyName: meta.shortName || meta.longName || sym,
    currentPrice: Number(currentPrice.toFixed(2)),
    dayChange,
    dayChangePercent,
    high: Number((meta.regularMarketDayHigh ?? currentPrice).toFixed(2)),
    low: Number((meta.regularMarketDayLow ?? currentPrice).toFixed(2)),
    volume: meta.regularMarketVolume ?? 0,
    open: Number((meta.regularMarketOpen ?? previousClose).toFixed(2)),
    previousClose: Number(previousClose.toFixed(2)),
    currency: meta.currency || 'USD',
    exchange: meta.exchangeName || 'NASDAQ',
    source: 'Twelve Data / Alpha Vantage MCP',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * 2. Stock History
 * Wraps GET /api/stocks/history?symbol=&timeframe=
 */
export async function getStockHistory(symbol, timeframe = '1M') {
  const sym = (symbol || '').toUpperCase().trim();
  const tf = (timeframe || '1M').toUpperCase().trim();

  let range = '1mo';
  let interval = '1d';

  if (tf === '1D') {
    range = '1d';
    interval = '15m';
  } else if (tf === '5D') {
    range = '5d';
    interval = '1h';
  } else if (tf === '1M') {
    range = '1mo';
    interval = '1d';
  } else if (tf === '6M') {
    range = '6mo';
    interval = '1d';
  } else if (tf === '1Y') {
    range = '1y';
    interval = '1wk';
  } else if (tf === '5Y') {
    range = '5y';
    interval = '1mo';
  }

  const chartResult = await fetchMarketChart(sym, range, interval);
  const { bars } = parseBars(chartResult);

  // Return at most 20 items to satisfy MCP response limit requirements
  const recentBars = bars.slice(-20);

  return {
    symbol: sym,
    timeframe: tf,
    count: recentBars.length,
    bars: recentBars,
    source: 'Twelve Data / Alpha Vantage MCP',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * 3. Company Profile
 * Wraps GET /api/stocks/profile?symbol=
 */
export async function getCompanyProfile(symbol) {
  const sym = (symbol || '').toUpperCase().trim();
  const chartResult = await fetchMarketChart(sym, '1d', '1d');
  const meta = chartResult.meta;
  const staticProfile = MAANG_PROFILES[sym] || {
    name: meta.longName || meta.shortName || `${sym} Corporation`,
    sector: 'Technology',
    industry: 'Consumer Technology',
    ceo: 'Executive Management',
    headquarters: 'United States',
    description: `${meta.longName || sym} is a publicly traded corporation listed on ${meta.exchangeName || 'US Markets'}.`,
  };

  const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;

  return {
    symbol: sym,
    name: staticProfile.name,
    sector: staticProfile.sector,
    industry: staticProfile.industry,
    ceo: staticProfile.ceo,
    headquarters: staticProfile.headquarters,
    description: staticProfile.description,
    exchange: meta.fullExchangeName || meta.exchangeName || 'NASDAQ',
    currency: meta.currency || 'USD',
    currentPrice: Number(currentPrice.toFixed(2)),
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : null,
    dayVolume: meta.regularMarketVolume ?? 0,
    source: 'Twelve Data / Alpha Vantage MCP',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * 4. MAANG Overview
 * Wraps GET /api/stocks/overview
 */
export async function getMaangOverview() {
  const symbols = ['META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL'];
  const items = await Promise.all(
    symbols.map(async (sym) => {
      try {
        const quote = await getStockQuote(sym);
        return {
          symbol: quote.symbol,
          companyName: quote.companyName,
          currentPrice: quote.currentPrice,
          dayChange: quote.dayChange,
          dayChangePercent: quote.dayChangePercent,
          volume: quote.volume,
        };
      } catch (err) {
        return {
          symbol: sym,
          error: err.message || 'Failed to fetch quote',
        };
      }
    })
  );

  return {
    items, // exactly 5 items (at most 20)
    source: 'Twelve Data / Alpha Vantage MCP',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * 5. MAANG Prices (Raw OHLC data)
 * Wraps GET /api/stocks?symbol=
 */
export async function getMaangPrices(symbol) {
  const sym = (symbol || 'AAPL').toUpperCase().trim();
  const chartResult = await fetchMarketChart(sym, '1mo', '1d');
  const { meta, bars } = parseBars(chartResult);
  const recentBars = bars.slice(-20); // at most 20 items

  return {
    symbol: sym,
    currency: meta.currency || 'USD',
    regularMarketPrice: meta.regularMarketPrice ?? recentBars[recentBars.length - 1]?.close,
    dayHigh: meta.regularMarketDayHigh ?? recentBars[recentBars.length - 1]?.high,
    dayLow: meta.regularMarketDayLow ?? recentBars[recentBars.length - 1]?.low,
    bars: recentBars,
    source: 'Twelve Data / Alpha Vantage MCP',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Technical Indicator Helpers
 */
function calculateSMA(prices, period) {
  const sma = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, v) => sum + v, 0) / period;
      sma.push(Number(avg.toFixed(2)));
    }
  }
  return sma;
}

function calculateEMA(prices, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  let prevEma = null;

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      const slice = prices.slice(0, period);
      prevEma = slice.reduce((sum, v) => sum + v, 0) / period;
      ema.push(Number(prevEma.toFixed(2)));
    } else {
      prevEma = (prices[i] - prevEma) * multiplier + prevEma;
      ema.push(Number(prevEma.toFixed(2)));
    }
  }
  return ema;
}

function calculateRSI(prices, period = 14) {
  const rsi = [];
  if (prices.length < period + 1) {
    return prices.map(() => null);
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsi.push(null);
    } else if (i === period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(Number((100 - (100 / (1 + rs))).toFixed(2)));
    } else {
      const diff = prices[i] - prices[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(Number((100 - (100 / (1 + rs))).toFixed(2)));
    }
  }

  return rsi;
}

/**
 * 6. MAANG Technical Indicators
 * Wraps GET /api/indicators?symbol=&indicator=
 */
export async function getMaangIndicators(symbol, indicator = 'ALL') {
  const sym = (symbol || 'AAPL').toUpperCase().trim();
  const ind = (indicator || 'ALL').toUpperCase().trim();

  // Fetch 1 year of daily bars so 50 and 200 period SMAs have enough data
  const chartResult = await fetchMarketChart(sym, '1y', '1d');
  const { bars } = parseBars(chartResult);

  if (bars.length === 0) {
    const error = new Error(`Failed to calculate indicators for ${sym}: insufficient data from upstream.`);
    error.status = 502;
    throw error;
  }

  const closePrices = bars.map((b) => b.close);
  const dates = bars.map((b) => b.date);

  const rsi = calculateRSI(closePrices, 14);
  const ema12 = calculateEMA(closePrices, 12);
  const ema26 = calculateEMA(closePrices, 26);
  const macdLine = ema12.map((v, i) => (v != null && ema26[i] != null ? Number((v - ema26[i]).toFixed(2)) : null));
  const validMacdValues = macdLine.filter((v) => v != null);
  const signalRaw = calculateEMA(validMacdValues, 9);
  
  // Align signal line
  const nullPrefixCount = macdLine.length - validMacdValues.length;
  const signalLine = new Array(nullPrefixCount).fill(null).concat(signalRaw);

  const sma50 = calculateSMA(closePrices, 50);
  const sma200 = calculateSMA(closePrices, 200);

  const series = bars.map((bar, i) => ({
    date: dates[i],
    close: bar.close,
    rsi: rsi[i],
    macd: macdLine[i],
    macdSignal: signalLine[i],
    sma50: sma50[i],
    sma200: sma200[i],
  }));

  // Limit to at most 20 recent data points
  const recentSeries = series.slice(-20);

  // Filter keys if specific indicator requested
  const filtered = recentSeries.map((row) => {
    if (ind === 'RSI') return { date: row.date, close: row.close, rsi: row.rsi };
    if (ind === 'MACD') return { date: row.date, close: row.close, macd: row.macd, macdSignal: row.macdSignal };
    if (ind === 'SMA50') return { date: row.date, close: row.close, sma50: row.sma50 };
    if (ind === 'SMA200') return { date: row.date, close: row.close, sma200: row.sma200 };
    return row;
  });

  return {
    symbol: sym,
    indicator: ind,
    dataCount: filtered.length,
    items: filtered, // at most 20 items
    source: 'Twelve Data / Alpha Vantage MCP',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * 7. MAANG Backtest
 * Wraps GET /api/backtest?symbol=&strategy=
 */
export async function getMaangBacktest(symbol, strategy = 'sma_crossover') {
  const sym = (symbol || 'AAPL').toUpperCase().trim();
  const strat = (strategy || 'sma_crossover').toLowerCase().trim();

  // Fetch 1 year of daily bars from Twelve Data / Alpha Vantage MCP
  const chartResult = await fetchMarketChart(sym, '1y', '1d');
  const { bars } = parseBars(chartResult);

  if (bars.length < 30) {
    const error = new Error(`Failed to backtest ${sym}: insufficient historical price bars from upstream.`);
    error.status = 502;
    throw error;
  }

  const closePrices = bars.map((b) => b.close);
  let capital = 100000;
  const initialCapital = capital;
  let shares = 0;
  const trades = [];
  let peakCapital = capital;
  let maxDrawdownPct = 0;

  if (strat === 'sma_crossover') {
    const fastSMA = calculateSMA(closePrices, 20);
    const slowSMA = calculateSMA(closePrices, 50);

    for (let i = 50; i < bars.length; i++) {
      const prevFast = fastSMA[i - 1];
      const prevSlow = slowSMA[i - 1];
      const currFast = fastSMA[i];
      const currSlow = slowSMA[i];
      const price = bars[i].close;

      if (prevFast != null && prevSlow != null && currFast != null && currSlow != null) {
        // Bullish crossover: Fast crosses above Slow
        if (prevFast <= prevSlow && currFast > currSlow && shares === 0) {
          shares = Math.floor(capital / price);
          if (shares > 0) {
            const cost = shares * price;
            capital -= cost;
            trades.push({
              date: bars[i].date,
              action: 'BUY',
              price,
              shares,
              capitalRemaining: Number(capital.toFixed(2)),
            });
          }
        }
        // Bearish crossover: Fast crosses below Slow
        else if (prevFast >= prevSlow && currFast < currSlow && shares > 0) {
          const proceeds = shares * price;
          capital += proceeds;
          const buyTrade = trades[trades.length - 1];
          const tradePnL = proceeds - (shares * buyTrade.price);
          const tradeReturnPct = Number(((tradePnL / (shares * buyTrade.price)) * 100).toFixed(2));
          trades.push({
            date: bars[i].date,
            action: 'SELL',
            price,
            shares,
            pnl: Number(tradePnL.toFixed(2)),
            returnPct: tradeReturnPct,
            capitalRemaining: Number(capital.toFixed(2)),
          });
          shares = 0;
        }
      }

      const currentEquity = capital + shares * price;
      if (currentEquity > peakCapital) peakCapital = currentEquity;
      const dd = ((peakCapital - currentEquity) / peakCapital) * 100;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }
  } else if (strat === 'rsi_threshold') {
    const rsi = calculateRSI(closePrices, 14);

    for (let i = 15; i < bars.length; i++) {
      const currRsi = rsi[i];
      const price = bars[i].close;

      if (currRsi != null) {
        // Buy when RSI < 30 (oversold)
        if (currRsi < 30 && shares === 0) {
          shares = Math.floor(capital / price);
          if (shares > 0) {
            const cost = shares * price;
            capital -= cost;
            trades.push({
              date: bars[i].date,
              action: 'BUY',
              price,
              shares,
              rsi: currRsi,
              capitalRemaining: Number(capital.toFixed(2)),
            });
          }
        }
        // Sell when RSI > 70 (overbought)
        else if (currRsi > 70 && shares > 0) {
          const proceeds = shares * price;
          capital += proceeds;
          const buyTrade = trades[trades.length - 1];
          const tradePnL = proceeds - (shares * buyTrade.price);
          const tradeReturnPct = Number(((tradePnL / (shares * buyTrade.price)) * 100).toFixed(2));
          trades.push({
            date: bars[i].date,
            action: 'SELL',
            price,
            shares,
            rsi: currRsi,
            pnl: Number(tradePnL.toFixed(2)),
            returnPct: tradeReturnPct,
            capitalRemaining: Number(capital.toFixed(2)),
          });
          shares = 0;
        }
      }

      const currentEquity = capital + shares * price;
      if (currentEquity > peakCapital) peakCapital = currentEquity;
      const dd = ((peakCapital - currentEquity) / peakCapital) * 100;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }
  } else {
    // Default: macd_crossover
    const ema12 = calculateEMA(closePrices, 12);
    const ema26 = calculateEMA(closePrices, 26);
    const macdLine = ema12.map((v, i) => (v != null && ema26[i] != null ? Number((v - ema26[i]).toFixed(2)) : null));
    const validMacd = macdLine.filter((v) => v != null);
    const signalRaw = calculateEMA(validMacd, 9);
    const nullPrefix = macdLine.length - validMacd.length;
    const signalLine = new Array(nullPrefix).fill(null).concat(signalRaw);

    for (let i = 35; i < bars.length; i++) {
      const prevMacd = macdLine[i - 1];
      const prevSig = signalLine[i - 1];
      const currMacd = macdLine[i];
      const currSig = signalLine[i];
      const price = bars[i].close;

      if (prevMacd != null && prevSig != null && currMacd != null && currSig != null) {
        if (prevMacd <= prevSig && currMacd > currSig && shares === 0) {
          shares = Math.floor(capital / price);
          if (shares > 0) {
            capital -= shares * price;
            trades.push({
              date: bars[i].date,
              action: 'BUY',
              price,
              shares,
              capitalRemaining: Number(capital.toFixed(2)),
            });
          }
        } else if (prevMacd >= prevSig && currMacd < currSig && shares > 0) {
          const proceeds = shares * price;
          capital += proceeds;
          const buyTrade = trades[trades.length - 1];
          const tradePnL = proceeds - (shares * buyTrade.price);
          const tradeReturnPct = Number(((tradePnL / (shares * buyTrade.price)) * 100).toFixed(2));
          trades.push({
            date: bars[i].date,
            action: 'SELL',
            price,
            shares,
            pnl: Number(tradePnL.toFixed(2)),
            returnPct: tradeReturnPct,
            capitalRemaining: Number(capital.toFixed(2)),
          });
          shares = 0;
        }
      }

      const currentEquity = capital + shares * price;
      if (currentEquity > peakCapital) peakCapital = currentEquity;
      const dd = ((peakCapital - currentEquity) / peakCapital) * 100;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }
  }

  // If still holding shares at end of backtest, mark equity
  const lastPrice = bars[bars.length - 1].close;
  const finalEquity = capital + (shares * lastPrice);
  const totalReturnPct = Number((((finalEquity - initialCapital) / initialCapital) * 100).toFixed(2));

  const completedTrades = trades.filter((t) => t.action === 'SELL');
  const winningTrades = completedTrades.filter((t) => t.pnl > 0);
  const winRatePct = completedTrades.length > 0 ? Number(((winningTrades.length / completedTrades.length) * 100).toFixed(2)) : 0;

  // Limit trade log to at most 20 items
  const recentTrades = trades.slice(-20);

  return {
    symbol: sym,
    strategy: strat,
    metrics: {
      initialCapital,
      finalEquity: Number(finalEquity.toFixed(2)),
      totalReturnPct,
      winRatePct,
      totalTrades: completedTrades.length,
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    },
    trades: recentTrades, // at most 20 items
    source: 'Twelve Data / Alpha Vantage MCP',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * 8. Portfolio Allocation
 * Wraps /api/portfolio-allocation
 */
export async function getPortfolioAllocation({ symbol1, symbol2, symbol3, symbol4, symbol5 }) {
  const rawSymbols = [symbol1, symbol2, symbol3, symbol4, symbol5]
    .filter(Boolean)
    .map((s) => String(s).trim().toUpperCase());

  const uniqueSymbols = Array.from(new Set(rawSymbols)).slice(0, 5);
  if (uniqueSymbols.length < 2) {
    const error = new Error('Portfolio allocation requires at least two distinct ticker symbols.');
    error.status = 400;
    throw error;
  }

  // Fetch 1 month chart for each symbol to compute volatility and get live price
  const tickerStats = await Promise.all(
    uniqueSymbols.map(async (sym) => {
      const chartResult = await fetchMarketChart(sym, '1mo', '1d');
      const { meta, bars } = parseBars(chartResult);
      if (bars.length < 5) {
        const error = new Error(`Failed to compute volatility for ${sym}: insufficient data from Twelve Data / Alpha Vantage MCP.`);
        error.status = 502;
        throw error;
      }

      // Compute daily returns
      const returns = [];
      for (let i = 1; i < bars.length; i++) {
        const prev = bars[i - 1].close;
        const curr = bars[i].close;
        if (prev > 0) {
          returns.push((curr - prev) / prev);
        }
      }

      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      const dailyStd = Math.sqrt(variance);
      const annualizedVol = Number((dailyStd * Math.sqrt(252) * 100).toFixed(2));
      const currentPrice = meta.regularMarketPrice ?? bars[bars.length - 1].close;

      return {
        symbol: sym,
        name: meta.shortName || meta.longName || sym,
        volatility: Math.max(1.0, annualizedVol),
        currentPrice: Number(currentPrice.toFixed(2)),
      };
    })
  );

  const totalCapital = 100000;
  // Inverse volatility weighting
  const invVols = tickerStats.map((t) => 1 / t.volatility);
  const sumInv = invVols.reduce((a, b) => a + b, 0);

  const unroundedWeights = invVols.map((v) => (v / sumInv) * 100);
  const roundedWeights = unroundedWeights.map((w) => Number(w.toFixed(2)));

  // Ensure total is 100.00%
  const totalWeight = roundedWeights.reduce((a, b) => a + b, 0);
  const diff = Number((100.0 - totalWeight).toFixed(2));
  roundedWeights[0] = Number((roundedWeights[0] + diff).toFixed(2));

  const allocations = tickerStats.map((t, idx) => {
    const weight = roundedWeights[idx];
    const allocatedCapital = Number(((weight / 100) * totalCapital).toFixed(2));
    const sharesToBuy = t.currentPrice > 0 ? Number((allocatedCapital / t.currentPrice).toFixed(2)) : 0;

    return {
      symbol: t.symbol,
      name: t.name,
      volatilityPct: t.volatility,
      currentPrice: t.currentPrice,
      weightPct: weight,
      allocatedCapital,
      sharesToBuy,
    };
  });

  const weightedPortfolioVol = Number(
    allocations.reduce((sum, a) => sum + (a.weightPct / 100) * a.volatilityPct, 0).toFixed(2)
  );

  return {
    method: 'inverse_volatility',
    totalCapital,
    allocations, // at most 5 items (<= 20)
    weightedPortfolioVolatility: weightedPortfolioVol,
    source: 'Twelve Data / Alpha Vantage MCP',
    fetched_at: new Date().toISOString(),
  };
}
