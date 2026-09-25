import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus, Sparkles, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { TickerQuote, TICKER_PALETTE } from '../types/market.ts';

const SUGGESTED_SYMBOLS = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductors' },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Consumer Electronics' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Software & Cloud' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Internet Services' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'E-commerce & Cloud' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', sector: 'Social Media' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Automotive & Clean Energy' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'Index ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)', sector: 'Index ETF' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors' },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Data & AI' },
  { symbol: 'ARM', name: 'Arm Holdings plc', sector: 'Semiconductors' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', sector: 'Semiconductors' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Semiconductors' },
  { symbol: 'BTC-USD', name: 'Bitcoin (USD)', sector: 'Cryptocurrency' },
];

const PRESETS = [
  { name: 'AI & Chips', symbols: ['NVDA', 'AMD', 'TSM', 'AVGO', 'ARM'] },
  { name: 'Tech Titans', symbols: ['AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN'] },
  { name: 'Indices & Mega', symbols: ['SPY', 'QQQ', 'AAPL', 'NVDA', 'MSFT'] },
  { name: 'High Volatility', symbols: ['TSLA', 'COIN', 'PLTR', 'ARM', 'BTC-USD'] },
];

interface TickerBarProps {
  selectedSymbols: string[];
  focusedSymbol: string;
  onSelectFocusedSymbol: (symbol: string) => void;
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  onApplyPreset: (symbols: string[]) => void;
  quotes: Record<string, TickerQuote>;
}

export const TickerBar: React.FC<TickerBarProps> = ({
  selectedSymbols,
  focusedSymbol,
  onSelectFocusedSymbol,
  onAddSymbol,
  onRemoveSymbol,
  onApplyPreset,
  quotes,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter autocomplete suggestions
  const filtered = SUGGESTED_SYMBOLS.filter(
    (item) =>
      !selectedSymbols.includes(item.symbol) &&
      (item.symbol.toLowerCase().includes(query.toLowerCase()) ||
        item.name.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (symbol: string) => {
    if (selectedSymbols.length >= 5) {
      alert('Maximum of 5 simultaneous tickers allowed for optimal comparison.');
      return;
    }
    onAddSymbol(symbol);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0 && isOpen) {
        handleSelect(filtered[highlightIndex]?.symbol || filtered[0].symbol);
      } else if (query.trim()) {
        handleSelect(query.trim().toUpperCase());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 sm:p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Input & Autocomplete */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                  setHighlightIndex(0);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search ticker (e.g. NVDA, AAPL)..."
                disabled={selectedSymbols.length >= 5}
                className="w-64 sm:w-72 pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-700/80 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50 font-mono"
              />
              {selectedSymbols.length < 5 && query && (
                <button
                  onClick={() => handleSelect(query.toUpperCase())}
                  className="absolute right-1.5 px-2 py-0.5 rounded text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              )}
            </div>

            {/* Dropdown list */}
            {isOpen && filtered.length > 0 && (
              <div className="absolute left-0 mt-1.5 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 z-50 max-h-64 overflow-y-auto">
                <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                  Suggested Market Tickers
                </div>
                {filtered.map((item, idx) => (
                  <button
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors ${
                      idx === highlightIndex ? 'bg-cyan-950/60 text-cyan-200' : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded">
                        {item.symbol}
                      </span>
                      <span className="text-zinc-300 truncate max-w-[130px]">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">{item.sector}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs">
            <span className="text-zinc-500 text-[11px] font-medium flex items-center mr-1">
              <Sparkles className="w-3 h-3 text-cyan-400 mr-1" />
              Presets:
            </span>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onApplyPreset(preset.symbols)}
                className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/60 text-[11px] font-medium transition-colors cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Counter Info */}
        <div className="text-xs text-zinc-400 flex items-center space-x-1.5 font-mono">
          <span>Active Tickers:</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold">
            {selectedSymbols.length} / 5
          </span>
        </div>
      </div>

      {/* Selected Ticker Chips */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {selectedSymbols.map((sym, idx) => {
          const color = TICKER_PALETTE[idx % TICKER_PALETTE.length];
          const isFocused = focusedSymbol === sym;
          const quote = quotes[sym];
          const isPositive = quote ? quote.change >= 0 : true;

          return (
            <div
              key={sym}
              className={`flex items-center space-x-2 pl-2.5 pr-1.5 py-1.5 rounded-lg border text-xs transition-all ${
                isFocused
                  ? 'bg-zinc-800/90 border-zinc-500 shadow-md ring-1 ring-cyan-500/40'
                  : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Color swatch dot */}
              <button
                onClick={() => onSelectFocusedSymbol(sym)}
                className="flex items-center space-x-2 group cursor-pointer text-left"
                title={`Click to focus ${sym} for candlestick inspection`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                  {sym}
                </span>
                {isFocused && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                    FOCUS
                  </span>
                )}
              </button>

              {/* Live quote pill */}
              {quote && (
                <div className="flex items-center space-x-1.5 font-mono pl-1 border-l border-zinc-800">
                  <span className="text-zinc-200">${quote.price.toFixed(2)}</span>
                  <span
                    className={`flex items-center text-[10px] px-1 rounded ${
                      isPositive
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                    )}
                    {isPositive ? '+' : ''}
                    {quote.changePercent.toFixed(2)}%
                  </span>
                </div>
              )}

              {/* Remove button */}
              {selectedSymbols.length > 1 && (
                <button
                  onClick={() => onRemoveSymbol(sym)}
                  className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors ml-1"
                  title={`Remove ${sym}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
