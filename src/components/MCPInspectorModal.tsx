import React, { useState } from 'react';
import {
  Server,
  X,
  Check,
  Copy,
  Terminal,
  Activity,
  Layers,
  Zap,
  Radio,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { MCPServerStatus } from '../types/market.ts';

interface MCPInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: MCPServerStatus[];
  preferredProvider: string;
  onSetPreferred: (id: string) => void;
  onToggleSimulateFailure: (id: string) => void;
  configData: {
    claudeDesktopConfig?: any;
    nodeSDKScript?: string;
    pythonFastMCPScript?: string;
  } | null;
  onRefreshStatus: () => void;
}

export const MCPInspectorModal: React.FC<MCPInspectorModalProps> = ({
  isOpen,
  onClose,
  servers,
  preferredProvider,
  onSetPreferred,
  onToggleSimulateFailure,
  configData,
  onRefreshStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'servers' | 'claude_config' | 'node_sdk' | 'python_sdk'>('servers');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: MCPServerStatus['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>CONNECTED</span>
          </span>
        );
      case 'simulated':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>ACTIVE (HIGH-RES)</span>
          </span>
        );
      case 'rate_limited':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>RATE LIMITED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>OFFLINE</span>
          </span>
        );
    }
  };

  const formattedClaudeConfig = configData?.claudeDesktopConfig
    ? JSON.stringify(configData.claudeDesktopConfig, null, 2)
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
                <span>Model Context Protocol (MCP) Infrastructure</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono font-normal">
                  STDIO & SSE
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Data layer orchestration, transport diagnostics, and desktop client configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-zinc-800 bg-zinc-900/20 text-xs font-mono">
          <button
            onClick={() => setActiveTab('servers')}
            className={`py-3 px-3 border-b-2 font-medium flex items-center space-x-2 transition-colors ${
              activeTab === 'servers'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Active MCP Servers ({servers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('claude_config')}
            className={`py-3 px-3 border-b-2 font-medium flex items-center space-x-2 transition-colors ${
              activeTab === 'claude_config'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>claude_desktop_config.json</span>
          </button>
          <button
            onClick={() => setActiveTab('node_sdk')}
            className={`py-3 px-3 border-b-2 font-medium flex items-center space-x-2 transition-colors ${
              activeTab === 'node_sdk'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Node.js MCP Client</span>
          </button>
          <button
            onClick={() => setActiveTab('python_sdk')}
            className={`py-3 px-3 border-b-2 font-medium flex items-center space-x-2 transition-colors ${
              activeTab === 'python_sdk'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Python FastMCP</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'servers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-zinc-400">
                <p>
                  Connected MCP servers with automatic failover chain: <span className="text-zinc-200">Yahoo Finance MCP</span> → <span className="text-zinc-200">Alpha Vantage MCP</span> → <span className="text-zinc-200">Twelve Data MCP</span> → <span className="text-zinc-200">High-Res Cache</span>.
                </p>
                <button
                  onClick={onRefreshStatus}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ping Transports</span>
                </button>
              </div>

              {/* Server Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {servers.map((server) => {
                  const isPref = preferredProvider === server.id;
                  const isFailing = server.status === 'rate_limited';

                  return (
                    <div
                      key={server.id}
                      className={`border rounded-xl p-4 space-y-3 transition-all ${
                        isPref
                          ? 'bg-zinc-900/90 border-cyan-600/70 shadow-lg shadow-cyan-950/30'
                          : 'bg-zinc-900/40 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-zinc-100 text-sm">{server.name}</span>
                            {isPref && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            Transport: <span className="text-zinc-300 uppercase">{server.transport}</span> • Latency: <span className="text-emerald-400">{server.latencyMs}ms</span>
                          </div>
                        </div>
                        {getStatusBadge(server.status)}
                      </div>

                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-400 flex items-center justify-between">
                        <span className="truncate max-w-[240px] text-zinc-300">{server.commandOrUrl}</span>
                        <span className="text-zinc-400 text-[10px]">{server.requestCount} calls</span>
                      </div>

                      {/* Discovered Tools */}
                      <div>
                        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-semibold">
                          Discovered MCP Tools ({server.supportedTools.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {server.supportedTools.map((tool) => (
                            <span
                              key={tool}
                              className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700/60"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Interactive Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <button
                          onClick={() => onSetPreferred(server.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            isPref
                              ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {isPref ? 'Preferred Provider' : 'Set as Primary'}
                        </button>

                        {server.id !== 'mcp-fallback-cache' && (
                          <button
                            onClick={() => onToggleSimulateFailure(server.id)}
                            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                              isFailing
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-zinc-800 text-zinc-400 hover:text-amber-300 hover:bg-zinc-700'
                            }`}
                            title="Simulate server outage or rate limit to test client failover"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>{isFailing ? 'Restore Server' : 'Simulate Outage'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'claude_config' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-200">Claude Desktop MCP Configuration</h3>
                  <p className="text-zinc-400 text-xs">
                    Paste this JSON block into your <code className="text-cyan-400">~/Library/Application Support/Claude/claude_desktop_config.json</code> or Windows <code className="text-cyan-400">%APPDATA%\Claude\claude_desktop_config.json</code>.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(formattedClaudeConfig, 'claude')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
                >
                  {copiedKey === 'claude' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'claude' ? 'Copied!' : 'Copy Config'}</span>
                </button>
              </div>

              <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                {formattedClaudeConfig}
              </pre>
            </div>
          )}

          {activeTab === 'node_sdk' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-200">Official @modelcontextprotocol/sdk Setup Script</h3>
                  <p className="text-zinc-400 text-xs">
                    Connects directly to the Yahoo Finance MCP server using Node.js STDIO transport.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(configData?.nodeSDKScript || '', 'node')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
                >
                  {copiedKey === 'node' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'node' ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>

              <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                {configData?.nodeSDKScript}
              </pre>
            </div>
          )}

          {activeTab === 'python_sdk' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-200">Python FastMCP / mcp Client Script</h3>
                  <p className="text-zinc-400 text-xs">
                    Python client connecting via <code className="text-cyan-400">stdio_client</code> to query equity prices and OHLCV bars.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(configData?.pythonFastMCPScript || '', 'python')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
                >
                  {copiedKey === 'python' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'python' ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>

              <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                {configData?.pythonFastMCPScript}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>Model Context Protocol v1.0 • Transport: STDIO & SSE</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
