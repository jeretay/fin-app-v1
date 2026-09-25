import React, { useState } from 'react';
import { Download, X, FileText, Check, Database } from 'lucide-react';
import { ComparisonDataset } from '../types/market.ts';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonData: ComparisonDataset[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  comparisonData,
}) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    let content = '';
    let filename = `market_data_${Date.now()}`;
    let mimeType = 'text/plain';

    if (format === 'json') {
      filename += '.json';
      mimeType = 'application/json';
      content = JSON.stringify(comparisonData, null, 2);
    } else {
      filename += '.csv';
      mimeType = 'text/csv';
      // Build unified CSV
      const rows: string[] = [
        'Symbol,Timestamp,Open,High,Low,Close,Volume,AdjustedClose,NormalizedPct,SMA20,SMA50,SMA200,RollingStdDev',
      ];
      comparisonData.forEach((dataset) => {
        dataset.bars.forEach((b) => {
          rows.push(
            [
              b.symbol,
              b.timestamp,
              b.open,
              b.high,
              b.low,
              b.close,
              b.volume,
              b.adjusted_close,
              b.normalizedPct ?? '',
              b.sma[20] ?? '',
              b.sma[50] ?? '',
              b.sma[200] ?? '',
              b.rollingStdDev ?? '',
            ].join(',')
          );
        });
      });
      content = rows.join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-zinc-100 text-sm">Export Financial Dataset</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Export standardized OHLCV bars, calculated moving averages, rolling standard deviations, and normalized multi-ticker series.
        </p>

        <div className="space-y-2">
          <label className="text-xs text-zinc-300 font-medium">Export Format</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('csv')}
              className={`p-3 rounded-lg border text-xs font-mono flex items-center space-x-2 transition-all ${
                format === 'csv'
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
              }`}
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>CSV Spreadsheet</span>
            </button>

            <button
              onClick={() => setFormat('json')}
              className={`p-3 rounded-lg border text-xs font-mono flex items-center space-x-2 transition-all ${
                format === 'json'
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
              }`}
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Normalized JSON</span>
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs font-mono space-y-1 text-zinc-400">
          <div className="flex justify-between">
            <span>Active Tickers:</span>
            <span className="text-zinc-200 font-bold">{comparisonData.map((d) => d.symbol).join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Normalized Bars:</span>
            <span className="text-zinc-200 font-bold">
              {comparisonData.reduce((acc, d) => acc + d.bars.length, 0)}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-all shadow-md"
          >
            {downloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{downloaded ? 'Downloaded!' : `Download ${format.toUpperCase()}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
