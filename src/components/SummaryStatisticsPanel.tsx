import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  Zap,
  Target,
  ArrowRight,
  Info,
  Scale,
} from 'lucide-react';
import { ComparisonDataset } from '../types/market.ts';
import { calculatePortfolioAllocation } from '../utils/portfolio.ts';

interface SummaryStatisticsPanelProps {
  comparisonData: ComparisonDataset[];
  focusedSymbol: string;
  onSelectFocusedSymbol: (symbol: string) => void;
}

export const SummaryStatisticsPanel: React.FC<SummaryStatisticsPanelProps> = ({
  comparisonData,
  focusedSymbol,
  onSelectFocusedSymbol,
}) => {
  if (!comparisonData || comparisonData.length === 0) {
    return null;
  }

  const allocationSummary = useMemo(() => {
    return calculatePortfolioAllocation(comparisonData, 'inverse_volatility', 100000);
  }, [comparisonData]);

  const weightMap = useMemo(() => {
    const map: Record<string, number> = {};
    allocationSummary.allocations.forEach((a) => {
      map[a.symbol] = a.weight;
    });
    return map;
  }, [allocationSummary]);

  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case 'Strong Bullish':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60 font-bold';
      case 'Bullish':
        return 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40';
      case 'Strong Bearish':
        return 'bg-rose-950/80 text-rose-400 border-rose-700/60 font-bold';
      case 'Bearish':
        return 'bg-rose-950/50 text-rose-300 border-rose-800/40';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Multi-Ticker Analytical Comparison Matrix</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Side-by-side technical metrics, rolling volatility ($N=20$), and moving average crossover signals
          </p>
        </div>
        <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800 self-start sm:self-auto">
          Comparing {comparisonData.length} Tickers
        </div>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-zinc-800 text-[11px] text-zinc-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Ticker / Asset</th>
              <th className="py-2.5 px-3 text-right">Current Price</th>
              <th className="py-2.5 px-3 text-right">Day Change</th>
              <th className="py-2.5 px-3 text-center min-w-[160px]">Day Range (L - H)</th>
              <th className="py-2.5 px-3 text-right">Rolling Vol (σ)</th>
              <th className="py-2.5 px-3 text-right">Annualized Vol</th>
              <th className="py-2.5 px-3 text-right">Vol Weight (100%)</th>
              <th className="py-2.5 px-3 text-left">MA Status / Signal</th>
              <th className="py-2.5 px-3 text-center">Provider</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {comparisonData.map((dataset) => {
              const { symbol, quote, summary, color } = dataset;
              const isFocused = focusedSymbol === symbol;
              const isPositive = quote.change >= 0;

              // Day Range calculation
              const dayRangeSpan = Math.max(0.01, quote.high - quote.low);
              const dayPosPercent = Math.max(
                0,
                Math.min(100, ((quote.price - quote.low) / dayRangeSpan) * 100)
              );

              return (
                <tr
                  key={symbol}
                  onClick={() => onSelectFocusedSymbol(symbol)}
                  className={`cursor-pointer transition-colors group ${
                    isFocused
                      ? 'bg-zinc-800/50 hover:bg-zinc-800/70'
                      : 'hover:bg-zinc-800/30'
                  }`}
                  title="Click to focus for Candlestick & Technical view"
                >
                  {/* Ticker & Name */}
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                            {symbol}
                          </span>
                          {isFocused && (
                            <span className="text-[9px] px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                              FOCUSED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-[130px]">
                          {quote.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Current Price */}
                  <td className="py-3 px-3 text-right font-bold text-zinc-100">
                    ${quote.price.toFixed(2)}
                  </td>

                  {/* Day Change */}
                  <td className="py-3 px-3 text-right">
                    <div
                      className={`inline-flex items-center space-x-1 font-semibold ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {quote.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {isPositive ? '+' : ''}${quote.change.toFixed(2)}
                    </div>
                  </td>

                  {/* Day Range Bar */}
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>${quote.low.toFixed(2)}</span>
                        <span>${quote.high.toFixed(2)}</span>
                      </div>
                      <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${dayPosPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Rolling StdDev */}
                  <td className="py-3 px-3 text-right text-zinc-200">
                    ${summary.rollingStdDev.toFixed(2)}
                  </td>

                  {/* Annualized Volatility */}
                  <td className="py-3 px-3 text-right text-zinc-300">
                    {summary.annualizedVolatility.toFixed(1)}%
                  </td>

                  {/* Vol Weight (100%) */}
                  <td className="py-3 px-3 text-right">
                    <span className="font-bold text-cyan-400">
                      {(weightMap[symbol] ?? 0).toFixed(1)}%
                    </span>
                  </td>

                  {/* MA Signal */}
                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getSignalBadge(
                          summary.maSignal
                        )}`}
                      >
                        {summary.maSignal}
                      </span>
                      <div className="text-[10px] text-zinc-400 truncate max-w-[200px]" title={summary.maSignalDetails}>
                        {summary.maSignalDetails}
                      </div>
                    </div>
                  </td>

                  {/* Provider */}
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                      {summary.provider.replace('mcp-', '')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
