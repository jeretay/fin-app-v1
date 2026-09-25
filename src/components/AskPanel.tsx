import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Wrench,
  AlertTriangle,
  ServerOff,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Cpu,
} from 'lucide-react';

interface ToolCall {
  name: string;
  args: Record<string, any>;
  failed: boolean;
}

interface UnavailableServer {
  address: string;
  reason: string;
}

interface AskResponse {
  answer: string;
  tool_calls: ToolCall[];
  unavailable: UnavailableServer[];
  model: string;
  answered_at: string;
}

export const AskPanel: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleQuestions = [
    'What is the current stock price and day change for Apple (AAPL)?',
    'Calculate a risk-balanced portfolio allocation between AAPL, MSFT, and NVDA with $50,000.',
    'Give me an overview of all MAANG equities and their latest performance.',
  ];

  const handleAsk = async (qToAsk?: string) => {
    const q = (qToAsk ?? question).trim();
    if (!q || isLoading) return;
    if (q.length > 500) {
      setError('Question exceeds maximum allowed 500 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.reason || `Request failed with status ${res.status}`);
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to get answer from agent.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              Financial Agent (MCP + Gemini)
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                gemini-3.8-flash
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ask natural language questions. Gemini discovers and executes tools from connected MCP servers.
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Agent Ready</span>
        </div>
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="mb-4">
        <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
          Suggested queries:
        </div>
        <div className="flex flex-wrap gap-2">
          {sampleQuestions.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestion(sq);
                handleAsk(sq);
              }}
              disabled={isLoading}
              className="text-xs text-left px-3 py-1.5 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700/60 hover:border-zinc-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              "{sq}"
            </button>
          ))}
        </div>
      </div>

      {/* Input box and submit button */}
      <div className="relative mb-6">
        <textarea
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
          placeholder="Ask a question about MAANG stock quotes, company profiles, historical trends, or risk-parity portfolio allocations..."
          className="w-full bg-zinc-950/80 border border-zinc-700/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all resize-none font-sans"
        />

        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-xs font-mono ${
              question.length > 450 ? 'text-amber-400 font-semibold' : 'text-zinc-400'
            }`}
          >
            {question.length} / 500 characters
          </span>

          <button
            onClick={() => handleAsk()}
            disabled={isLoading || !question.trim()}
            className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white disabled:text-zinc-500 font-medium text-sm transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Consulting Agent...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ask Agent</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-sm flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-rose-200">Agent Error</div>
            <div className="text-xs text-rose-300/90 font-mono">{error}</div>
          </div>
        </div>
      )}

      {/* Answer & Tool Results */}
      {result && (
        <div className="space-y-6 pt-2 border-t border-zinc-800/80">
          {/* Answer Section */}
          <div className="bg-zinc-950/60 border border-zinc-800/90 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Agent Answer
              </span>
              <div className="flex items-center space-x-3 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-zinc-400" />
                  {result.model}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  {new Date(result.answered_at).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-sans">
              {result.answer}
            </div>
          </div>

          {/* Tools Called (Under the answer) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                Tools Called by Agent ({result.tool_calls.length})
              </h3>
              {result.tool_calls.length === 0 && (
                <span className="text-xs text-zinc-400 font-mono">No tools required</span>
              )}
            </div>

            {result.tool_calls.length > 0 ? (
              <div className="space-y-3">
                {result.tool_calls.map((call, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-mono font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <code className="text-xs font-mono font-semibold text-cyan-300">
                          {call.name}
                        </code>
                      </div>

                      {call.failed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </span>
                      )}
                    </div>

                    {/* Tool Arguments */}
                    <div className="bg-zinc-900/90 rounded-md p-2.5 border border-zinc-800/80 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                      <span className="text-zinc-400 select-none mr-2">Arguments:</span>
                      <code>{JSON.stringify(call.args)}</code>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-zinc-950/30 border border-zinc-800/60 text-xs text-zinc-400 italic">
                The agent answered without calling external MCP tools.
              </div>
            )}
          </div>

          {/* Unavailable Servers in Grey */}
          {result.unavailable && result.unavailable.length > 0 && (
            <div className="p-3.5 rounded-lg bg-zinc-950/40 border border-zinc-800/60 text-zinc-400">
              <div className="flex items-center space-x-2 mb-2">
                <ServerOff className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Unavailable MCP Servers ({result.unavailable.length})
                </span>
              </div>

              <div className="space-y-2 mt-2">
                {result.unavailable.map((srv, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-zinc-900/50 border border-zinc-800/50 text-[11px] font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-zinc-400"
                  >
                    <span className="text-zinc-300 font-medium truncate max-w-sm">
                      {srv.address}
                    </span>
                    <span className="text-zinc-400 truncate max-w-md" title={srv.reason}>
                      {srv.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
