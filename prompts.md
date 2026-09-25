# Conversation Prompts Archive

This document compiles all user requests and prompts submitted during the development session for **TickerMeToday** / **TickerPulse** (Financial Analytics & MCP Integration platform).

---

## Session Metadata
- **Project**: TickerMeToday (Financial Market Analytics & MCP Data Server)
- **Repository**: `jeretay/fin-app-v1`
- **Export Date**: 2026-09-25

---

## Prompt 1: Initial Application Construction
> **User Request**:
> Create a comprehensive, production-grade financial market intelligence and multi-ticker comparison platform featuring:
> - Real-time market data quotes and multi-ticker overlay comparisons (NVDA, AAPL, MSFT, GOOGL, AMZN, META, TSLA, SPY, QQQ).
> - Normalized percentage performance and multi-timeframe candlestick visualization (1D, 5D, 1M, 6M, 1Y).
> - Quantitative technical indicators: SMA (20, 50, 200), EMA (12, 26), Bollinger Bands (20-period, 2.0 std dev), and rolling annualized volatility.
> - Inverse-volatility risk-weighted portfolio allocation engine with live rebalancing calculators.
> - Multi-provider failover architecture integrating Model Context Protocol (MCP) data servers (`mcp-server-yfinance`, `alphavantage-mcp`, `twelvedata-mcp`, and high-resolution cache).
> - Interactive MCP inspector, client script generator (Claude Desktop, Node.js SDK, Python FastMCP), and data export tools (CSV, JSON).

---

## Prompt 2: Reliability & Error Recovery
> **User Request**:
> `Continue`
>
> *(Context: Resolved `Failed to load market data: Failed to fetch` by implementing instant client-side high-resolution synthetic data fallback, aggressive network timeouts, and resilient state recovery).*

---

## Prompt 3: Indicator Extension - Standard Deviation vs Previous Day
> **User Request**:
> Add a new indicator to the interactive chart to show the standard deviation compare to previous trading day.

---

## Prompt 4: Recovery from Intermittent API Error
> **User Request**:
> There was an unexpected error. Finish what you were doing.

---

## Prompt 5: Branding & App Title Update
> **User Request**:
> Change the app title to TickerMeToday

---

## Prompt 6: GitHub Remote Push Request
> **User Request**:
> `git push https://<GITHUB_PERSONAL_ACCESS_TOKEN>@github.com/jeretay/fin-app-v1.git`
> *(Note: Personal access token masked in accordance with security guardrails).*

---

## Prompt 7: MCP Server Publication Specification (`/api/mcp`)
> **User Request**:
> **ROLE**: You are a senior full-stack developer working in this existing Vite + React project. It already has `server.ts`, which the AI Studio preview runs, and an `api/` folder at the project root, which Vercel runs.
>
> **GOAL**: Publish this app's existing data routes as an MCP server at `/api/mcp`, so that an agent this team did not write can discover the tools and call them.
>
> **OUTPUT**:
> 1. Add `@modelcontextprotocol/sdk` at exactly version `1.30.1`, and `zod` if it is not installed. Do not use `@modelcontextprotocol/server`, `@modelcontextprotocol/client` or `mcp-handler`: they speak a newer protocol that Gemini's SDK does not accept yet.
> 2. Create `api/mcp.js` at the project root, beside `package.json` and never inside `src/`. It exports `default async function handler(req, res)`.
>    - On **POST**: create new `McpServer({ name: "app-fin-v1-server", version: "1.0.0" })`, register the tools below, create new `StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`, `await server.connect(transport)`, then `await transport.handleRequest(req, res, req.body)`. When `res` closes, close the transport and the server. Build both fresh on every request; this server keeps no sessions.
>    - On any other method: answer 405 with `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Method not allowed"},"id":null}`.
> 3. In `server.ts`, after `express.json()`, register the same handler with `app.post("/api/mcp", handler)` and `app.get("/api/mcp", handler)`, importing it from `api/mcp.js` rather than copying it. The preview runs this form and Vercel runs the file; neither works in the other place, so I need both.
> 4. Register these tools with `server.registerTool`, each calling the shared function its route already uses, imported directly, never by fetching this app's own URL:
>    - `af_pf_alloc(symbol1, symbol2, symbol3, symbol4, symbol5)`: wraps `/api/portfolio-allocation`; symbol3 to symbol5 are optional.
>    - `af_get_stock_quote(symbol)`: wraps `GET /api/stocks/quote?symbol=` and returns real-time or recent price quote metrics (current price, day change, high, low, volume) for MAANG stocks (`META`, `AAPL`, `AMZN`, `NFLX`, `GOOGL`).
>    - `af_get_stock_history(symbol, timeframe)`: wraps `GET /api/stocks/history?symbol=&timeframe=` and returns historical price performance time-series data for a specific stock.
>    - `af_get_company_profile(symbol)`: wraps `GET /api/stocks/profile?symbol=` and returns company profile details, industry sector, and fundamental metrics for a MAANG company.
>    - `af_get_maang_overview()`: wraps `GET /api/stocks/overview` and returns a consolidated summary matrix of all MAANG stocks tracked by the application.
>    - `af_maang_prices({ symbol })`: wraps `GET /api/stocks?symbol=` and returns live and historical price data for a given MAANG stock (Meta, Apple, Amazon, Netflix, Google). The result comes from upstream market APIs (Yahoo Finance, Alpha Vantage, Polygon). Use this tool when an agent needs raw OHLC data for analysis. It does not cover non‑MAANG stocks or crypto.
>    - `af_maang_indicators({ symbol, indicator })`: wraps `GET /api/indicators?symbol=&indicator=` and returns calculated technical indicators (RSI, MACD, SMA50, SMA200) for a given MAANG stock. The result is computed from upstream market data. Use this tool when an agent needs to detect overbought/oversold conditions or trend shifts. It does not cover fundamental metrics like earnings or revenue.
>    - `af_maang_backtest({ symbol, strategy })`: wraps `GET /api/backtest?symbol=&strategy=` and returns backtest results on historical MAANG stock data using a chosen strategy (e.g., SMA crossover, RSI thresholds, MACD crossover). The result is simulated locally from upstream market data. Use this tool when an agent needs to validate signals historically. It does not cover live trading or execution.
>
>    **Tool Specifications**:
>    - Every tool name starts with `af_` and uses only lowercase letters, digits, and underscores.
>    - Every description is two to four sentences: what comes back, which upstream it is read from, when an agent should use it, and one thing it does not cover.
>    - Every input is a `zod` type with `.describe()` saying exactly what it accepts, matching and validating the parameters the route already takes.
>    - Every tool has annotations: `{ readOnlyHint: true, openWorldHint: true }`.
>    - Every tool returns `{ content: [{ type: "text", text: JSON.stringify(result) }] }`, where result holds at most 20 items, a `"source"` naming the upstream, and `"fetched_at"` as an ISO time.
>    - If the upstream fails, the tool returns `{ isError: true, content: [{ type: "text", text: one sentence naming what failed and the upstream status }] }`. A tool never returns sample, seed, or fallback data.
> 5. Shared code lives in `lib/`, or in files under `api/` whose names start with an underscore. Vercel turns every other file in `api/` into a public address.
>
> **GUARDRAILS**: Read-only tools only: nothing that writes, sends, deletes or spends. Never put a key, token or password, or any part of one, in a tool result, a description or a log; keys stay in process.env. No database and no login. Leave the existing routes and screens as they are.
>
> **CONTEXT**: Deployed on Vercel from GitHub. Environment variables already in use: `GEMINI_API_KEY`. Other teams' agents will call `https://fin-app-v1-tau.vercel.app/api/mcp` through the Gemini SDK's `mcpToTool`, which speaks MCP protocol 2025-11-25 over Streamable HTTP.

---

## Prompt 8: Git Push Repeat
> **User Request**:
> `git push https://<GITHUB_PERSONAL_ACCESS_TOKEN>@github.com/jeretay/fin-app-v1.git`
> *(Note: Personal access token masked in accordance with security guardrails).*

---

## Prompt 9: Export Request
> **User Request**:
> `export the prompts as a .md file`
