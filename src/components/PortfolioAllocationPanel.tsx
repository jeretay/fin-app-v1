import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Percent,
  DollarSign,
  ShieldCheck,
  TrendingDown,
  Info,
  Scale,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  AllocationMethod,
  ComparisonDataset,
} from '../types/market.ts';
import { calculatePortfolioAllocation } from '../utils/portfolio.ts';

interface PortfolioAllocationPanelProps {
  comparisonData: ComparisonDataset[];
  focusedSymbol: string;
  onSelectFocusedSymbol: (symbol: string) => void;
}

const PRESET_CAPITALS = [10000, 50000, 100000, 250000, 500000];

export const PortfolioAllocationPanel: React.FC<PortfolioAllocationPanelProps> = ({
  comparisonData,
  focusedSymbol,
  onSelectFocusedSymbol,
}) => {
  const [method, setMethod] = useState<AllocationMethod>('inverse_volatility');
  const [totalCapital, setTotalCapital] = useState<number>(100000);
  const [isCustomCapital, setIsCustomCapital] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  // Compute portfolio allocation
  const portfolioSummary = useMemo(() => {
    return calculatePortfolioAllocation(comparisonData, method, totalCapital);
  }, [comparisonData, method, totalCapital]);

  if (!comparisonData || comparisonData.length === 0) {
    return null;
  }

  // Calculate sum of weights to show verification
  const totalWeight = Number(
    portfolioSummary.allocations.reduce((acc, it) => acc + it.weight, 0).toFixed(2)
  );

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4 backdrop-blur-sm">
      {/* Panel Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
              <span>Volatility-Weighted Portfolio Allocation</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-400 border border-emerald-800 font-semibold">
                Exact 100.00%
              </span>
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Capital is dynamically allocated inversely proportional to each asset's volatility ($\sigma$) to balance risk contribution.
          </p>
        </div>

        {/* Strategy Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setMethod('inverse_volatility')}
              className={`px-2.5 py-1 rounded transition-colors ${
                method === 'inverse_volatility'
                  ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/70 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Weights proportional to 1 / Volatility (Risk Parity)"
            >
              Inverse Vol (1/σ)
            </button>
            <button
              onClick={() => setMethod('inverse_variance')}
              className={`px-2.5 py-1 rounded transition-colors ${
                method === 'inverse_variance'
                  ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/70 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Weights proportional to 1 / Variance (Low Volatility Maximizer)"
            >
              Inverse Var (1/σ²)
            </button>
            <button
              onClick={() => setMethod('equal_weight')}
              className={`px-2.5 py-1 rounded transition-colors ${
                method === 'equal_weight'
                  ? 'bg-zinc-800 text-zinc-200 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Equal capital distribution (1 / N)"
            >
              Equal (1/N)
            </button>
          </div>

          <button
            onClick={() => setShowFormula(!showFormula)}
            className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-cyan-300 transition-colors"
            title="Toggle Math & Formula Details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Formula & Explanation Drawer */}
      {showFormula && (
        <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-300 space-y-2 font-mono">
          <div className="flex items-center justify-between font-semibold text-cyan-400">
            <span>Risk Parity & Volatility Allocation Mathematics</span>
            <button onClick={() => setShowFormula(false)} className="text-zinc-500 hover:text-zinc-300">
              ✕
            </button>
          </div>
          <div className="bg-zinc-900/80 p-2.5 rounded-lg text-[11px] text-zinc-300 overflow-x-auto space-y-1">
            <div>
              <span className="text-amber-400">Inverse Volatility:</span>{' '}
              <code>w_i = (1 / σ_i) / Σ (1 / σ_j) × 100%</code>
            </div>
            <div>
              <span className="text-amber-400">Constraint:</span>{' '}
              <code>Σ w_i ≡ 100.00% (Guaranteed total capital deployment)</code>
            </div>
            <div>
              <span className="text-amber-400">Shares Order:</span>{' '}
              <code>Shares_i = (Total Capital × w_i) / Price_i</code>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            Higher volatility assets receive lower capital weighting so no single volatile asset dominates the portfolio's total drawdowns.
          </p>
        </div>
      )}

      {/* Top Portfolio Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Allocation */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Total Allocation</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-mono font-bold text-emerald-400">
            {totalWeight.toFixed(2)}%
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">100% fully allocated</div>
        </div>

        {/* Portfolio Capital */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Portfolio Capital</span>
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-mono font-bold text-zinc-100">
            ${totalCapital.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">Deployable cash</div>
        </div>

        {/* Weighted Portfolio Volatility */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Portfolio Vol (σₚ)</span>
            <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-mono font-bold text-cyan-400">
            {portfolioSummary.weightedPortfolioVolatility.toFixed(1)}%
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">Annualized risk</div>
        </div>

        {/* Diversification Benefit */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Diversification Benefit</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-mono font-bold text-amber-300">
            +{portfolioSummary.diversificationBenefitPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">Risk reduction vs avg</div>
        </div>
      </div>

      {/* 100% Stacked Allocation Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Capital Allocation Breakdown (Total 100%):</span>
          <span>{portfolioSummary.allocations.length} Active Assets</span>
        </div>

        {/* The Bar */}
        <div className="w-full h-7 bg-zinc-950 rounded-xl overflow-hidden flex border border-zinc-800 shadow-inner p-0.5">
          {portfolioSummary.allocations.map((alloc) => {
            const isHovered = hoveredSymbol === alloc.symbol;
            return (
              <div
                key={alloc.symbol}
                onMouseEnter={() => setHoveredSymbol(alloc.symbol)}
                onMouseLeave={() => setHoveredSymbol(null)}
                onClick={() => onSelectFocusedSymbol(alloc.symbol)}
                style={{
                  width: `${alloc.weight}%`,
                  backgroundColor: alloc.color,
                }}
                className={`h-full transition-all cursor-pointer relative group flex items-center justify-center overflow-hidden first:rounded-l-lg last:rounded-r-lg ${
                  isHovered ? 'brightness-125 ring-2 ring-white z-10' : 'hover:brightness-110'
                }`}
                title={`${alloc.symbol}: ${alloc.weight}% ($${alloc.allocatedCapital.toLocaleString()})`}
              >
                {alloc.weight >= 8 && (
                  <span className="text-[11px] font-mono font-bold text-zinc-950 drop-shadow-sm truncate px-1">
                    {alloc.symbol} {alloc.weight.toFixed(1)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend under the bar */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono">
          {portfolioSummary.allocations.map((alloc) => (
            <button
              key={alloc.symbol}
              onClick={() => onSelectFocusedSymbol(alloc.symbol)}
              onMouseEnter={() => setHoveredSymbol(alloc.symbol)}
              onMouseLeave={() => setHoveredSymbol(null)}
              className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-md border text-[11px] transition-colors cursor-pointer ${
                hoveredSymbol === alloc.symbol || focusedSymbol === alloc.symbol
                  ? 'bg-zinc-800 border-zinc-600 text-white'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: alloc.color }} />
              <span className="font-bold">{alloc.symbol}:</span>
              <span className="text-cyan-400 font-semibold">{alloc.weight.toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* Capital Preset Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 text-xs">
        <div className="flex items-center space-x-1.5 font-mono text-[11px] text-zinc-400">
          <span>Investment Amount:</span>
          {PRESET_CAPITALS.map((cap) => (
            <button
              key={cap}
              onClick={() => {
                setTotalCapital(cap);
                setIsCustomCapital(false);
              }}
              className={`px-2 py-0.5 rounded transition-colors ${
                totalCapital === cap && !isCustomCapital
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ${cap >= 1000000 ? `${cap / 1000000}M` : `${cap / 1000}k`}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <span className="text-zinc-500 text-[11px]">Custom ($):</span>
          <input
            type="number"
            min="1000"
            max="100000000"
            step="1000"
            value={totalCapital}
            onChange={(e) => {
              const val = Math.max(100, Number(e.target.value) || 0);
              setTotalCapital(val);
              setIsCustomCapital(true);
            }}
            className="w-28 px-2 py-0.5 bg-zinc-950 border border-zinc-700 rounded text-right text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Allocation Breakdown Table */}
      <div className="overflow-x-auto pt-1">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-zinc-800 text-[11px] text-zinc-400 uppercase tracking-wider">
              <th className="py-2 px-3">Asset</th>
              <th className="py-2 px-3 text-right">Price</th>
              <th className="py-2 px-3 text-right">Volatility (σ)</th>
              <th className="py-2 px-3 text-right min-w-[120px]">Allocation Weight</th>
              <th className="py-2 px-3 text-right">Capital ($)</th>
              <th className="py-2 px-3 text-right">Target Shares</th>
              <th className="py-2 px-3 text-center">Risk Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {portfolioSummary.allocations.map((alloc) => {
              const isFocused = focusedSymbol === alloc.symbol;
              const isHovered = hoveredSymbol === alloc.symbol;

              const getRiskTier = (vol: number) => {
                if (vol < 20) return { label: 'Low Vol', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
                if (vol < 35) return { label: 'Medium Vol', badge: 'bg-blue-950 text-blue-300 border-blue-800' };
                return { label: 'High Vol', badge: 'bg-amber-950 text-amber-300 border-amber-800' };
              };

              const tier = getRiskTier(alloc.volatility);

              return (
                <tr
                  key={alloc.symbol}
                  onClick={() => onSelectFocusedSymbol(alloc.symbol)}
                  onMouseEnter={() => setHoveredSymbol(alloc.symbol)}
                  onMouseLeave={() => setHoveredSymbol(null)}
                  className={`cursor-pointer transition-colors ${
                    isHovered || isFocused
                      ? 'bg-zinc-800/60'
                      : 'hover:bg-zinc-850/30'
                  }`}
                >
                  {/* Asset */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: alloc.color }} />
                      <div>
                        <span className="font-bold text-zinc-100">{alloc.symbol}</span>
                        <div className="text-[10px] text-zinc-400 truncate max-w-[120px]">{alloc.name}</div>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-2.5 px-3 text-right text-zinc-200">
                    ${alloc.currentPrice.toFixed(2)}
                  </td>

                  {/* Volatility */}
                  <td className="py-2.5 px-3 text-right font-bold text-zinc-300">
                    {alloc.volatility.toFixed(1)}%
                  </td>

                  {/* Weight with Mini Progress Bar */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="space-y-1">
                      <div className="font-bold text-cyan-300 text-sm">
                        {alloc.weight.toFixed(2)}%
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${alloc.weight}%`,
                            backgroundColor: alloc.color,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Capital */}
                  <td className="py-2.5 px-3 text-right font-bold text-zinc-100">
                    ${alloc.allocatedCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Shares */}
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                    {alloc.sharesToBuy.toLocaleString(undefined, { maximumFractionDigits: 2 })} shs
                  </td>

                  {/* Risk Tier */}
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${tier.badge}`}>
                      {tier.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-700 bg-zinc-950/60 font-bold text-zinc-200">
              <td className="py-2.5 px-3">Total Portfolio</td>
              <td className="py-2.5 px-3 text-right">-</td>
              <td className="py-2.5 px-3 text-right text-cyan-400">
                {portfolioSummary.weightedPortfolioVolatility.toFixed(1)}% (σₚ)
              </td>
              <td className="py-2.5 px-3 text-right text-emerald-400 font-bold text-sm">
                {totalWeight.toFixed(2)}%
              </td>
              <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                ${totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-2.5 px-3 text-right text-zinc-400">-</td>
              <td className="py-2.5 px-3 text-center">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                  100% Balanced
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
