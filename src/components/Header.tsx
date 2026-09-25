import React from 'react';
import {
  Activity,
  Layers,
  RefreshCw,
  Server,
  Code2,
  TrendingUp,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { MCPServerStatus } from '../types/market.ts';

interface HeaderProps {
  serverStatuses: MCPServerStatus[];
  preferredProvider: string;
  onOpenMCPModal: () => void;
  onOpenExportModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  lastUpdated: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  serverStatuses,
  preferredProvider,
  onOpenMCPModal,
  onOpenExportModal,
  onRefresh,
  isLoading,
  autoRefresh,
  onToggleAutoRefresh,
  lastUpdated,
}) => {
  // Find current active primary provider
  const primaryServer =
    serverStatuses.find((s) => s.id === preferredProvider) ||
    serverStatuses.find((s) => s.status === 'connected') ||
    serverStatuses[0];

  const hasDegraded = serverStatuses.some(
    (s) => s.status === 'rate_limited' || s.status === 'degraded'
  );

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-zinc-100">
                Ticker<span className="text-cyan-400">Pulse</span>
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-medium">
                MCP Core
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Multi-Ticker Analytics & Financial Engine
            </p>
          </div>
        </div>

        {/* Live Market & MCP Provider Status Badge */}
        <div className="hidden md:flex items-center space-x-4 text-xs font-mono">
          {/* Market Status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-zinc-200">US Markets:</span>
            <span className="text-emerald-400 font-semibold">Active Feed</span>
          </div>

          {/* Active MCP Connection */}
          <button
            onClick={onOpenMCPModal}
            className={`flex items-center space-x-2 px-2.5 py-1 rounded-md border transition-all hover:bg-zinc-800/80 cursor-pointer ${
              hasDegraded
                ? 'bg-amber-950/40 border-amber-700/60 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
            title="Click to view MCP diagnostics & connection inspector"
          >
            {hasDegraded ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            ) : (
              <Server className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="truncate max-w-[170px]">
              {primaryServer ? primaryServer.name.split(' ')[0] : 'MCP'}:{' '}
              <span className="text-cyan-400">{primaryServer?.transport.toUpperCase()}</span>
            </span>
            <span className="text-[10px] text-zinc-400">
              {primaryServer ? `${primaryServer.latencyMs}ms` : ''}
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={onToggleAutoRefresh}
            className={`px-2.5 py-1.5 text-xs font-mono rounded-md border transition-colors flex items-center space-x-1.5 ${
              autoRefresh
                ? 'bg-cyan-950/60 border-cyan-700/70 text-cyan-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Auto-refresh quotes every 10 seconds"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">10s Sync:</span>
            <span>{autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh Quotes Now"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Export Data */}
          <button
            onClick={onOpenExportModal}
            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Export Dataset (CSV/JSON)"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* MCP Inspector Modal Trigger */}
          <button
            onClick={onOpenMCPModal}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-medium shadow-sm transition-all"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">MCP Layer</span>
          </button>
        </div>
      </div>
    </header>
  );
};
