import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  CalculatedBar,
  ChartMode,
  ComparisonDataset,
  IndicatorSettings,
  TICKER_PALETTE,
} from '../types/market.ts';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface InteractiveChartProps {
  mode: ChartMode;
  focusedSymbol: string;
  focusedBars: CalculatedBar[];
  comparisonData: ComparisonDataset[];
  indicators: IndicatorSettings;
  isLoading: boolean;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  mode,
  focusedSymbol,
  focusedBars,
  comparisonData,
  indicators,
  isLoading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 500 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Brush / Zoom range: [startIndex, endIndex] as fractions 0.0 to 1.0
  const [rangeFraction, setRangeFraction] = useState<[number, number]>([0, 1]);
  const isDraggingBrush = useRef<'start' | 'end' | 'middle' | null>(null);
  const dragStartClientX = useRef<number>(0);
  const dragStartFractions = useRef<[number, number]>([0, 1]);

  // Handle ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Determine active dataset based on mode
  const rawBars = useMemo(() => {
    if (mode === 'candlestick') {
      return focusedBars;
    }
    // In comparison mode, use bars from first ticker as time master
    return comparisonData[0]?.bars || [];
  }, [mode, focusedBars, comparisonData]);

  // Slice bars according to rangeFraction
  const totalPoints = rawBars.length;
  const startIdx = Math.max(0, Math.floor(rangeFraction[0] * (totalPoints - 1)));
  const endIdx = Math.min(totalPoints - 1, Math.ceil(rangeFraction[1] * (totalPoints - 1)));
  const visibleBars = useMemo(() => {
    if (totalPoints === 0) return [];
    return rawBars.slice(startIdx, endIdx + 1);
  }, [rawBars, startIdx, endIdx, totalPoints]);

  // Layout parameters
  const padding = { top: 25, right: 65, bottom: indicators.showVolume ? 100 : 55, left: 15 };
  const chartWidth = Math.max(10, dimensions.width - padding.left - padding.right);
  const mainChartHeight = Math.max(10, dimensions.height - padding.top - padding.bottom);
  const volumeHeight = indicators.showVolume ? 45 : 0;
  const volumeTop = dimensions.height - padding.bottom + 8;
  const brushHeight = 22;
  const brushTop = dimensions.height - 30;

  // Render on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    if (totalPoints === 0 || visibleBars.length === 0) {
      ctx.fillStyle = '#71717a';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isLoading ? 'Fetching market data from MCP...' : 'No historical data available', dimensions.width / 2, dimensions.height / 2);
      return;
    }

    const n = visibleBars.length;
    const barWidth = Math.max(1, chartWidth / n);
    const getX = (idx: number) => padding.left + (idx + 0.5) * barWidth;

    // ----------------------------------------------------
    // 1. CALCULATE Y-SCALES
    // ----------------------------------------------------
    let minY = Infinity;
    let maxY = -Infinity;

    if (mode === 'candlestick') {
      visibleBars.forEach((b) => {
        if (b.low < minY) minY = b.low;
        if (b.high > maxY) maxY = b.high;
        if (indicators.showBollinger && b.bollinger?.lower != null) {
          if (b.bollinger.lower < minY) minY = b.bollinger.lower;
        }
        if (indicators.showBollinger && b.bollinger?.upper != null) {
          if (b.bollinger.upper > maxY) maxY = b.bollinger.upper;
        }
        if (indicators.showSma20 && b.sma[20] != null) {
          minY = Math.min(minY, b.sma[20]!);
          maxY = Math.max(maxY, b.sma[20]!);
        }
        if (indicators.showSma50 && b.sma[50] != null) {
          minY = Math.min(minY, b.sma[50]!);
          maxY = Math.max(maxY, b.sma[50]!);
        }
        if (indicators.showSma200 && b.sma[200] != null) {
          minY = Math.min(minY, b.sma[200]!);
          maxY = Math.max(maxY, b.sma[200]!);
        }
      });
      // Margin
      const ySpan = Math.max(0.1, maxY - minY);
      minY -= ySpan * 0.05;
      maxY += ySpan * 0.05;
    } else {
      // Comparison Mode (Normalized %)
      comparisonData.forEach((dataset) => {
        const sliced = dataset.bars.slice(startIdx, endIdx + 1);
        sliced.forEach((b) => {
          if (b.normalizedPct != null) {
            if (b.normalizedPct < minY) minY = b.normalizedPct;
            if (b.normalizedPct > maxY) maxY = b.normalizedPct;
          }
        });
      });
      if (minY === Infinity) {
        minY = -5;
        maxY = 5;
      }
      const ySpan = Math.max(1, maxY - minY);
      minY -= ySpan * 0.08;
      maxY += ySpan * 0.08;
    }

    const getY = (val: number) => {
      const clamped = Math.max(minY, Math.min(maxY, val));
      return padding.top + (1 - (clamped - minY) / (maxY - minY)) * mainChartHeight;
    };

    // ----------------------------------------------------
    // 2. DRAW HORIZONTAL GRID LINES & LABELS
    // ----------------------------------------------------
    ctx.strokeStyle = '#27272a'; // zinc-800
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const gridSteps = 5;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#a1a1aa'; // zinc-400
    ctx.textAlign = 'left';

    for (let i = 0; i <= gridSteps; i++) {
      const val = minY + (i / gridSteps) * (maxY - minY);
      const y = getY(val);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      const label = mode === 'candlestick' ? `$${val.toFixed(2)}` : `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
      ctx.fillText(label, padding.left + chartWidth + 6, y + 3);
    }

    // Baseline 0.00% line in comparison mode
    if (mode === 'comparison' && minY < 0 && maxY > 0) {
      const yZero = getY(0);
      ctx.setLineDash([]);
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, yZero);
      ctx.lineTo(padding.left + chartWidth, yZero);
      ctx.stroke();
    }

    ctx.setLineDash([]); // Reset line dash

    // ----------------------------------------------------
    // 3. CANDLESTICK MODE RENDERING
    // ----------------------------------------------------
    if (mode === 'candlestick') {
      // Draw Bollinger Band Cloud
      if (indicators.showBollinger) {
        ctx.beginPath();
        let started = false;
        // Upper band forward
        for (let i = 0; i < n; i++) {
          const upper = visibleBars[i].bollinger?.upper;
          if (upper != null) {
            const x = getX(i);
            const y = getY(upper);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        // Lower band backward
        for (let i = n - 1; i >= 0; i--) {
          const lower = visibleBars[i].bollinger?.lower;
          if (lower != null) {
            const x = getX(i);
            const y = getY(lower);
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.08)'; // cyan cloud
        ctx.fill();

        // Draw upper and lower dashed lines
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1;
        ['upper', 'lower'].forEach((bandKey) => {
          ctx.beginPath();
          let lineStarted = false;
          for (let i = 0; i < n; i++) {
            const val = (visibleBars[i].bollinger as any)?.[bandKey];
            if (val != null) {
              const x = getX(i);
              const y = getY(val);
              if (!lineStarted) {
                ctx.moveTo(x, y);
                lineStarted = true;
              } else {
                ctx.lineTo(x, y);
              }
            }
          }
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      // Draw Candlesticks
      const candleW = Math.max(1.5, Math.min(18, barWidth * 0.7));
      for (let i = 0; i < n; i++) {
        const bar = visibleBars[i];
        const x = getX(i);
        const yOpen = getY(bar.open);
        const yClose = getY(bar.close);
        const yHigh = getY(bar.high);
        const yLow = getY(bar.low);

        const isBullish = bar.close >= bar.open;
        const color = isBullish ? '#10b981' : '#f43f5e'; // emerald or rose

        // Wick line
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Candle Body
        const topBody = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
        ctx.fillStyle = color;
        ctx.fillRect(x - candleW / 2, topBody, candleW, bodyHeight);
      }

      // Helper to draw indicator lines
      const drawLineIndicator = (
        accessor: (b: CalculatedBar) => number | null | undefined,
        strokeColor: string,
        lineWidth: number = 1.5
      ) => {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < n; i++) {
          const val = accessor(visibleBars[i]);
          if (val != null) {
            const x = getX(i);
            const y = getY(val);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
      };

      if (indicators.showSma20) drawLineIndicator((b) => b.sma[20], '#fbbf24', 1.5); // amber
      if (indicators.showSma50) drawLineIndicator((b) => b.sma[50], '#60a5fa', 1.5); // blue
      if (indicators.showSma200) drawLineIndicator((b) => b.sma[200], '#c084fc', 2); // purple
      if (indicators.showEma12) drawLineIndicator((b) => b.ema[12], '#34d399', 1.5); // emerald
      if (indicators.showEma26) drawLineIndicator((b) => b.ema[26], '#f472b6', 1.5); // pink
    }

    // ----------------------------------------------------
    // 4. COMPARISON MODE RENDERING (Multi-Ticker Overlay)
    // ----------------------------------------------------
    if (mode === 'comparison') {
      comparisonData.forEach((dataset, dIdx) => {
        const color = dataset.color || TICKER_PALETTE[dIdx % TICKER_PALETTE.length];
        const sliced = dataset.bars.slice(startIdx, endIdx + 1);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        let started = false;

        for (let i = 0; i < sliced.length; i++) {
          const val = sliced[i].normalizedPct;
          if (val != null) {
            const x = getX(i);
            const y = getY(val);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();

        // Glowing end circle & ticker label
        if (sliced.length > 0) {
          const lastBar = sliced[sliced.length - 1];
          if (lastBar.normalizedPct != null) {
            const lastX = getX(sliced.length - 1);
            const lastY = getY(lastBar.normalizedPct);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Label tag at right
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(dataset.symbol, lastX + 6, lastY + 3);
          }
        }
      });
    }

    // ----------------------------------------------------
    // 5. VOLUME SUBPLOT
    // ----------------------------------------------------
    if (indicators.showVolume && visibleBars.length > 0) {
      const maxVol = Math.max(...visibleBars.map((b) => b.volume), 1);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(padding.left, volumeTop, chartWidth, volumeHeight);

      // Volume label
      ctx.fillStyle = '#71717a';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('VOL', padding.left + 4, volumeTop + 10);

      const vBarW = Math.max(1, barWidth * 0.7);
      for (let i = 0; i < n; i++) {
        const b = visibleBars[i];
        const vH = (b.volume / maxVol) * (volumeHeight - 12);
        const x = getX(i);
        const y = volumeTop + volumeHeight - vH;

        ctx.fillStyle = b.close >= b.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)';
        ctx.fillRect(x - vBarW / 2, y, vBarW, vH);
      }
    }

    // ----------------------------------------------------
    // 6. X-AXIS TIME LABELS
    // ----------------------------------------------------
    ctx.fillStyle = '#71717a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const xStep = Math.max(1, Math.floor(n / 6));

    for (let i = 0; i < n; i += xStep) {
      const bar = visibleBars[i];
      if (!bar) continue;
      const x = getX(i);
      const d = new Date(bar.timestamp);
      // Format date/time cleanly
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, dimensions.height - 35);
    }

    // ----------------------------------------------------
    // 7. TIME-WINDOW BRUSH SLIDER (Mini Overview)
    // ----------------------------------------------------
    ctx.fillStyle = '#18181b'; // zinc-900
    ctx.fillRect(padding.left, brushTop, chartWidth, brushHeight);

    // Mini sparkline inside brush
    if (rawBars.length > 1) {
      const rawMin = Math.min(...rawBars.map((b) => b.close));
      const rawMax = Math.max(...rawBars.map((b) => b.close));
      const getSparkY = (val: number) =>
        brushTop + brushHeight - 2 - ((val - rawMin) / Math.max(1, rawMax - rawMin)) * (brushHeight - 4);

      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < rawBars.length; i++) {
        const sx = padding.left + (i / (rawBars.length - 1)) * chartWidth;
        const sy = getSparkY(rawBars[i].close);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Active range highlight window
    const brushStartX = padding.left + rangeFraction[0] * chartWidth;
    const brushEndX = padding.left + rangeFraction[1] * chartWidth;
    const brushWinWidth = brushEndX - brushStartX;

    ctx.fillStyle = 'rgba(6, 182, 212, 0.15)'; // cyan translucent
    ctx.fillRect(brushStartX, brushTop, brushWinWidth, brushHeight);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(brushStartX, brushTop, brushWinWidth, brushHeight);

    // Handles on left & right
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(brushStartX - 2, brushTop + 4, 4, brushHeight - 8);
    ctx.fillRect(brushEndX - 2, brushTop + 4, 4, brushHeight - 8);

    // ----------------------------------------------------
    // 8. INTERACTIVE CROSSHAIR & TOOLTIP HIGHLIGHT
    // ----------------------------------------------------
    if (mousePos && hoverIndex !== null && hoverIndex >= 0 && hoverIndex < n) {
      const activeBar = visibleBars[hoverIndex];
      const hx = getX(hoverIndex);
      const hy = mousePos.y;

      // Vertical dashed line
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, padding.top);
      ctx.lineTo(hx, padding.top + mainChartHeight);
      ctx.stroke();

      // Horizontal dashed line (clamped to main chart)
      if (hy >= padding.top && hy <= padding.top + mainChartHeight) {
        ctx.beginPath();
        ctx.moveTo(padding.left, hy);
        ctx.lineTo(padding.left + chartWidth, hy);
        ctx.stroke();

        // Current crosshair Y value pill
        const currentVal = minY + (1 - (hy - padding.top) / mainChartHeight) * (maxY - minY);
        const yPill = mode === 'candlestick' ? `$${currentVal.toFixed(2)}` : `${currentVal > 0 ? '+' : ''}${currentVal.toFixed(2)}%`;
        ctx.fillStyle = '#27272a';
        ctx.fillRect(padding.left + chartWidth + 2, hy - 8, 55, 16);
        ctx.fillStyle = '#e4e4e7';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(yPill, padding.left + chartWidth + 4, hy + 4);
      }
      ctx.setLineDash([]);
    }
  }, [
    dimensions,
    rawBars,
    visibleBars,
    mode,
    indicators,
    comparisonData,
    focusedSymbol,
    rangeFraction,
    hoverIndex,
    mousePos,
    isLoading,
  ]);

  // Handle Mouse Events for Hover / Crosshair & Brush Dragging
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Handle brush dragging
    if (isDraggingBrush.current) {
      const deltaX = clientX - dragStartClientX.current;
      const deltaFraction = deltaX / chartWidth;
      const [startF, endF] = dragStartFractions.current;

      if (isDraggingBrush.current === 'start') {
        const newStart = Math.max(0, Math.min(endF - 0.05, startF + deltaFraction));
        setRangeFraction([newStart, endF]);
      } else if (isDraggingBrush.current === 'end') {
        const newEnd = Math.min(1, Math.max(startF + 0.05, endF + deltaFraction));
        setRangeFraction([startF, newEnd]);
      } else if (isDraggingBrush.current === 'middle') {
        const span = endF - startF;
        let newStart = startF + deltaFraction;
        let newEnd = endF + deltaFraction;
        if (newStart < 0) {
          newStart = 0;
          newEnd = span;
        }
        if (newEnd > 1) {
          newEnd = 1;
          newStart = 1 - span;
        }
        setRangeFraction([newStart, newEnd]);
      }
      return;
    }

    setMousePos({ x: clientX, y: clientY });

    // Calculate hover index inside main chart
    if (
      clientX >= padding.left &&
      clientX <= padding.left + chartWidth &&
      clientY >= padding.top &&
      clientY <= padding.top + mainChartHeight
    ) {
      const relX = clientX - padding.left;
      const barW = chartWidth / visibleBars.length;
      const idx = Math.floor(relX / barW);
      if (idx >= 0 && idx < visibleBars.length) {
        setHoverIndex(idx);
      }
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Check if clicking inside Brush Slider
    if (clientY >= brushTop - 4 && clientY <= brushTop + brushHeight + 4) {
      const brushStartX = padding.left + rangeFraction[0] * chartWidth;
      const brushEndX = padding.left + rangeFraction[1] * chartWidth;

      dragStartClientX.current = clientX;
      dragStartFractions.current = [...rangeFraction];

      if (Math.abs(clientX - brushStartX) <= 8) {
        isDraggingBrush.current = 'start';
      } else if (Math.abs(clientX - brushEndX) <= 8) {
        isDraggingBrush.current = 'end';
      } else if (clientX > brushStartX && clientX < brushEndX) {
        isDraggingBrush.current = 'middle';
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingBrush.current = null;
  };

  const handleMouseLeave = () => {
    isDraggingBrush.current = null;
    setHoverIndex(null);
    setMousePos(null);
  };

  const resetZoom = () => {
    setRangeFraction([0, 1]);
  };

  const zoomIn = () => {
    const [s, e] = rangeFraction;
    const span = e - s;
    const newSpan = span * 0.7;
    const mid = (s + e) / 2;
    setRangeFraction([Math.max(0, mid - newSpan / 2), Math.min(1, mid + newSpan / 2)]);
  };

  const zoomOut = () => {
    const [s, e] = rangeFraction;
    const span = e - s;
    const newSpan = Math.min(1, span * 1.4);
    const mid = (s + e) / 2;
    let newS = mid - newSpan / 2;
    let newE = mid + newSpan / 2;
    if (newS < 0) {
      newS = 0;
      newE = Math.min(1, newSpan);
    }
    if (newE > 1) {
      newE = 1;
      newS = Math.max(0, 1 - newSpan);
    }
    setRangeFraction([newS, newE]);
  };

  // Hovered Bar details for crosshair tooltip readout
  const hoveredBar = hoverIndex !== null ? visibleBars[hoverIndex] : null;

  return (
    <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
      {/* Top Chart Header / Crosshair Readout Bar */}
      <div className="h-11 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-900/40 text-xs font-mono">
        <div className="flex items-center space-x-4 overflow-x-auto py-1 scrollbar-none">
          {mode === 'candlestick' && hoveredBar && (
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="font-bold text-zinc-100">{focusedSymbol}</span>
              <span className="text-zinc-400">
                O: <span className="text-zinc-200">${hoveredBar.open.toFixed(2)}</span>
              </span>
              <span className="text-zinc-400">
                H: <span className="text-zinc-200">${hoveredBar.high.toFixed(2)}</span>
              </span>
              <span className="text-zinc-400">
                L: <span className="text-zinc-200">${hoveredBar.low.toFixed(2)}</span>
              </span>
              <span className="text-zinc-400">
                C:{' '}
                <span
                  className={
                    hoveredBar.close >= hoveredBar.open ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }
                >
                  ${hoveredBar.close.toFixed(2)}
                </span>
              </span>
              <span className="text-zinc-400 hidden sm:inline">
                Vol: <span className="text-zinc-300">{(hoveredBar.volume / 1000000).toFixed(2)}M</span>
              </span>
              {indicators.showBollinger && hoveredBar.bollinger && (
                <span className="text-cyan-400/90 hidden lg:inline">
                  BB: [{hoveredBar.bollinger.lower?.toFixed(1)} - {hoveredBar.bollinger.upper?.toFixed(1)}]
                </span>
              )}
            </div>
          )}

          {mode === 'comparison' && hoveredBar && (
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="text-zinc-400 font-semibold">TICKERS @ {new Date(hoveredBar.timestamp).toLocaleDateString()}:</span>
              {comparisonData.map((d) => {
                const b = d.bars.slice(startIdx, endIdx + 1)[hoverIndex || 0];
                if (!b) return null;
                const isPos = (b.normalizedPct || 0) >= 0;
                return (
                  <div key={d.symbol} className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="font-bold text-zinc-200">{d.symbol}:</span>
                    <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                      {isPos ? '+' : ''}
                      {b.normalizedPct?.toFixed(2)}%
                    </span>
                    <span className="text-zinc-500 text-[10px]">(${b.close.toFixed(2)})</span>
                  </div>
                );
              })}
            </div>
          )}

          {!hoveredBar && (
            <div className="text-zinc-400 flex items-center space-x-2">
              <span className="text-cyan-400 font-semibold">{mode === 'candlestick' ? `${focusedSymbol} Candlestick & Technical Indicators` : `Multi-Ticker Normalized Percentage Baseline`}</span>
              <span className="text-zinc-500">| Hover over bars for crosshair inspection</span>
            </div>
          )}
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={zoomIn}
            className="p-1 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={zoomOut}
            className="p-1 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className="p-1 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Reset Time Window"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="relative w-full h-[480px] sm:h-[520px]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair select-none"
        />

        {/* Floating crosshair details card */}
        {hoveredBar && (
          <div className="absolute top-3 left-4 bg-zinc-900/90 border border-zinc-700/80 rounded-lg p-2.5 shadow-2xl backdrop-blur-md pointer-events-none text-xs font-mono space-y-1 z-20">
            <div className="text-zinc-400 border-b border-zinc-800 pb-1 text-[10px]">
              {new Date(hoveredBar.timestamp).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            {mode === 'candlestick' ? (
              <>
                <div className="grid grid-cols-2 gap-x-3 text-[11px]">
                  <span className="text-zinc-400">Open:</span>
                  <span className="text-right text-zinc-200">${hoveredBar.open.toFixed(2)}</span>
                  <span className="text-zinc-400">High:</span>
                  <span className="text-right text-zinc-200">${hoveredBar.high.toFixed(2)}</span>
                  <span className="text-zinc-400">Low:</span>
                  <span className="text-right text-zinc-200">${hoveredBar.low.toFixed(2)}</span>
                  <span className="text-zinc-400">Close:</span>
                  <span
                    className={`text-right font-bold ${
                      hoveredBar.close >= hoveredBar.open ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    ${hoveredBar.close.toFixed(2)}
                  </span>
                </div>
                {hoveredBar.rollingStdDev != null && (
                  <div className="border-t border-zinc-800 pt-1 text-[10px] text-zinc-400 flex justify-between">
                    <span>Rolling Vol (σ):</span>
                    <span className="text-cyan-400 font-bold">${hoveredBar.rollingStdDev.toFixed(2)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1">
                {comparisonData.map((d) => {
                  const b = d.bars.slice(startIdx, endIdx + 1)[hoverIndex || 0];
                  if (!b) return null;
                  const isPos = (b.normalizedPct || 0) >= 0;
                  return (
                    <div key={d.symbol} className="flex items-center justify-between space-x-3 text-[11px]">
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="font-bold text-zinc-200">{d.symbol}</span>
                      </div>
                      <span className={`font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPos ? '+' : ''}
                        {b.normalizedPct?.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Instructions / Legend */}
      <div className="px-4 py-2 bg-zinc-900/60 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-4">
          {mode === 'candlestick' ? (
            <div className="flex items-center space-x-3">
              <span className="text-zinc-500">Legend:</span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                <span className="text-zinc-300">Bullish Candle</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
                <span className="text-zinc-300">Bearish Candle</span>
              </span>
              {indicators.showBollinger && (
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-cyan-500/30 border border-cyan-400 rounded-sm" />
                  <span className="text-cyan-300">Bollinger Cloud (20, 2σ)</span>
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <span className="text-zinc-500">Overlay:</span>
              {comparisonData.map((d) => (
                <span key={d.symbol} className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-zinc-300 font-mono font-medium">{d.symbol}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="font-mono text-[10px] text-zinc-400">
          Showing {visibleBars.length} of {totalPoints} bars • Drag bottom slider to zoom window
        </div>
      </div>
    </div>
  );
};
