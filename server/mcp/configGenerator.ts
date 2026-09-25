/**
 * Configuration code generator for connecting local/remote MCP servers
 * Compatible with Claude Desktop, Cursor, and official Model Context Protocol SDKs.
 */

export interface MCPClaudeConfig {
  mcpServers: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
  }>;
}

export function generateClaudeDesktopConfig(alphavantageKey: string = 'YOUR_ALPHAVANTAGE_API_KEY'): MCPClaudeConfig {
  return {
    mcpServers: {
      'yfinance': {
        command: 'uvx',
        args: ['mcp-server-yfinance'],
        env: {
          YFINANCE_CACHE_DIR: '~/.cache/yfinance',
        },
      },
      'alphavantage': {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-alphavantage'],
        env: {
          ALPHAVANTAGE_API_KEY: alphavantageKey,
        },
      },
      'twelvedata': {
        command: 'npx',
        args: ['-y', 'twelvedata-mcp-server'],
        env: {
          TWELVE_DATA_API_KEY: 'YOUR_TWELVE_DATA_KEY',
        },
      },
    },
  };
}

export function generateNodeSDKClientScript(): string {
  return `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  // 1. Initialize STDIO transport to Yahoo Finance MCP Server
  const transport = new StdioClientTransport({
    command: "uvx",
    args: ["mcp-server-yfinance"],
  });

  const client = new Client({
    name: "tickerpulse-mcp-client",
    version: "1.0.0",
  }, {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  });

  await client.connect(transport);
  console.log("Connected to Yahoo Finance MCP Server!");

  // 2. Discover available tools
  const tools = await client.listTools();
  console.log("Discovered tools:", tools.tools.map(t => t.name));

  // 3. Call tool to fetch quote
  const quoteResult = await client.callTool({
    name: "yfinance_get_quote",
    arguments: { symbol: "NVDA" },
  });

  console.log("NVDA Quote:", quoteResult);
}

main().catch(console.error);`;
}

export function generatePythonFastMCPScript(): string {
  return `from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import asyncio
import json

async def run_market_query(symbol: str = "AAPL"):
    # Configure MCP server parameters
    server_params = StdioServerParameters(
        command="uvx",
        args=["mcp-server-yfinance"],
        env=None
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # List tools
            tools = await session.list_tools()
            print(f"Found {len(tools.tools)} MCP tools")

            # Call historical quote tool
            response = await session.call_tool(
                "yfinance_get_historical_ohlcv",
                arguments={"symbol": symbol, "range": "1mo", "interval": "1d"}
            )
            data = json.loads(response.content[0].text)
            print(f"Loaded {len(data)} normalized bars for {symbol}")

if __name__ == "__main__":
    asyncio.run(run_market_query("NVDA"))
`;
}
