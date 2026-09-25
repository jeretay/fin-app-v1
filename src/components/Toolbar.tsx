import React, { useState } from 'react';
import {
  CandlestickChart,
  LineChart,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  Check,
  Percent,
} from 'lucide-react';
import { ChartMode, IndicatorSettings, TimeInterval, TimeRange } from '../types/market.ts';

const RANGES: { label: string; value: TimeRange; defaultInterval: TimeInterval }[] = [
  { label: '1D', value: '1D', defaultInterval: '5m' },
  { label: '5D', value: '5D', defaultInterval: '15m' },
  { label: '1M', value: '1M', defaultInterval: '1h' },
  { label: '6M', value: '6M', defaultInterval: '1d' },
  { label: '1Y', value: '1Y', defaultInterval: '1d' },
  { label: 'YTD', value: 'YTD', defaultInterval: '1d' },
  { label: '5Y', value: '5Y', defaultInterval: '1wk' },
];

const INTERVALS: { label: string; value: TimeInterval }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '1d', value: '1d' },
  { label: '1wk', value: '1wk' },
];

interface ToolbarProps {
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange, interval?: TimeInterval) => void;
  selectedInterval: TimeInterval;
  onIntervalChange: (interval: TimeInterval) => void;
  indicators: IndicatorSettings;
  onUpdateIndicators: (settings: Partial<IndicatorSettings>) => void;
  activeTickerCount: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  onModeChange,
  selectedRange,
  onRangeChange,
  selectedInterval,
  onIntervalChange,
  indicators,
  onUpdateIndicators,
  activeTickerCount,
}) => {
  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 sm:px-4">
      {/* View Mode Toggle: Candlestick vs Normalized % */}
      <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
        <button
          onClick={() => onModeChange('candlestick')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'candlestick'
              ? 'bg-zinc-800 text-cyan-400 font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Candlestick OHLC + Technical Overlays for focused ticker"
        >
          <CandlestickChart className="w-3.5 h-3.5" />
          <span>Candlestick</span>
        </button>

        <button
          onClick={() => onModeChange('comparison')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'comparison'
              ? 'bg-cyan-950/80 text-cyan-300 font-semibold shadow-sm border border-cyan-800/60'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Overlay all tickers normalized to 0.00% percentage change"
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Normalized % ({activeTickerCount})</span>
        </button>
      </div>

      {/* Time Range Selector (1D, 5D, 1M, 6M, 1Y, YTD, 5Y) */}
      <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 font-mono text-xs">
        {RANGES.map((r) => {
          const isActive = selectedRange === r.value;
          return (
            <button
              key={r.value}
              onClick={() => onRangeChange(r.value, r.defaultInterval)}
              className={`px-2.5 py-1 rounded transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Interval Selector (1m, 5m, 15m, 1h, 1d, 1wk) */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-zinc-500 font-mono text-[11px] hidden md:inline">Interval:</span>
        <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 font-mono">
          {INTERVALS.map((intv) => {
            const isActive = selectedInterval === intv.value;
            return (
              <button
                key={intv.value}
                onClick={() => onIntervalChange(intv.value)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  isActive
                    ? 'bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/70'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {intv.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Technical Indicators Config Popover */}
      <div className="relative">
        <button
          onClick={() => setShowIndicatorsMenu(!showIndicatorsMenu)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            indicators.showSma20 ||
            indicators.showSma50 ||
            indicators.showSma200 ||
            indicators.showBollinger
              ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Indicators</span>
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        </button>

        {showIndicatorsMenu && (
          <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3 z-50 text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
              <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
                Technical Overlays
              </span>
              <button
                onClick={() => setShowIndicatorsMenu(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* SMA Toggles */}
            <div className="space-y-1.5 mb-3">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block">
                Simple Moving Averages (SMA)
              </span>
              <label className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-800/80 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-zinc-300">SMA 20 (Short-term)</span>
                </div>
                <input
                  type="checkbox"
                  checked={indicators.showSma20}
                  onChange={(e) => onUpdateIndicators({ showSma20: e.target.checked })}
                  className="rounded border-zinc-700 text-cyan-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-800/80 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-zinc-300">SMA 50 (Medium-term)</span>
                </div>
                <input
                  type="checkbox"
                  checked={indicators.showSma50}
                  onChange={(e) => onUpdateIndicators({ showSma50: e.target.checked })}
                  className="rounded border-zinc-700 text-cyan-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-800/80 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-zinc-300">SMA 200 (Long-term Trend)</span>
                </div>
                <input
                  type="checkbox"
                  checked={indicators.showSma200}
                  onChange={(e) => onUpdateIndicators({ showSma200: e.target.checked })}
                  className="rounded border-zinc-700 text-cyan-600 focus:ring-0"
                />
              </label>
            </div>

            {/* EMA Toggles */}
            <div className="space-y-1.5 mb-3 border-t border-zinc-800 pt-2">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block">
                Exponential Moving Averages (EMA)
              </span>
              <label className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-800/80 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-zinc-300">EMA 12 (Fast)</span>
                </div>
                <input
                  type="checkbox"
                  checked={indicators.showEma12}
                  onChange={(e) => onUpdateIndicators({ showEma12: e.target.checked })}
                  className="rounded border-zinc-700 text-cyan-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-800/80 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="text-zinc-300">EMA 26 (Slow)</span>
                </div>
                <input
                  type="checkbox"
                  checked={indicators.showEma26}
                  onChange={(e) => onUpdateIndicators({ showEma26: e.target.checked })}
                  className="rounded border-zinc-700 text-cyan-600 focus:ring-0"
                />
              </label>
            </div>

            {/* Bollinger Bands */}
            <div className="space-y-1.5 border-t border-zinc-800 pt-2">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block">
                Bollinger Bands & Volatility
              </span>
              <label className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-800/80 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-zinc-300">Bollinger Bands (20, 2.0σ)</span>
                </div>
                <input
                  type="checkbox"
                  checked={indicators.showBollinger}
                  onChange={(e) => onUpdateIndicators({ showBollinger: e.target.checked })}
                  className="rounded border-zinc-700 text-cyan-600 focus:ring-0"
                />
              </label>

              {/* Volume */}
              <label className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-800/80 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-zinc-400" />
                  <span className="text-zinc-300">Volume Subplot</span>
                </div>
                <input
                  type="checkbox"
                  checked={indicators.showVolume}
                  onChange={(e) => onUpdateIndicators({ showVolume: e.target.checked })}
                  className="rounded border-zinc-700 text-cyan-600 focus:ring-0"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
