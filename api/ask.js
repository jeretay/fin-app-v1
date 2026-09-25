/**
 * Gemini Agent Endpoint for /api/ask
 * Protocol: MCP 2025-11-25 over Streamable HTTP client via @google/genai mcpToTool
 */

import { GoogleGenAI, mcpToTool } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function') {
    res.status(statusCode);
    if (typeof res.json === 'function') {
      res.json(data);
      return;
    }
  } else {
    res.statusCode = statusCode;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // 1. Check GEMINI_API_KEY
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
    sendJson(res, 503, {
      error: 'GEMINI_API_KEY is not set. Add it in Vercel and redeploy.',
    });
    return;
  }

  // 2. Validate question
  const rawBody = req.body;
  let question;
  if (typeof rawBody === 'string') {
    try {
      question = JSON.parse(rawBody)?.question;
    } catch {
      question = rawBody;
    }
  } else if (rawBody && typeof rawBody === 'object') {
    question = rawBody.question;
  }

  if (!question || typeof question !== 'string' || !question.trim() || question.trim().length > 500) {
    sendJson(res, 400, {
      error: 'Question is required and must not exceed 500 characters.',
    });
    return;
  }

  // 3. Connect to MCP servers
  const mcpServersValue =
    process.env.MCP_SERVERS !== undefined && process.env.MCP_SERVERS.trim() !== ''
      ? process.env.MCP_SERVERS
      : 'https://fin-app-v1-tau.vercel.app/api/mcp,https://mcp.alphavantage.co/mcp, https://mcp.twelvedata.com/mcp';

  const addresses = mcpServersValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const connectedClients = [];
  const allClients = [];
  const unavailable = [];

  for (const address of addresses) {
    let client = null;
    try {
      const url = new URL(address);
      client = new Client({ name: 'group6-agent', version: '1.0.0' });
      allClients.push(client);
      const transport = new StreamableHTTPClientTransport(url);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out after 8s')), 8000)
      );

      await Promise.race([client.connect(transport), timeoutPromise]);
      connectedClients.push(client);
    } catch (err) {
      if (client) {
        try {
          await client.close();
        } catch {}
      }
      unavailable.push({
        address,
        reason: err?.message || String(err) || 'Connection failed',
      });
    }
  }

  try {
    // 4. Initialize Gemini with mcpToTool
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const systemInstruction =
      'answer only from tool results; give the source and the fetched_at time for every figure; if a tool returns an error or nothing, say so in one sentence and do not guess; at most 120 words.';

    const tools = connectedClients.length > 0 ? [mcpToTool(...connectedClients)] : [];
    const config = {
      systemInstruction,
      ...(tools.length > 0 ? { tools, automaticFunctionCalling: { maximumRemoteCalls: 6 } } : {}),
    };

    let response;
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: question.trim(),
          config,
        });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt === 0 && (err.status === 503 || err.status === 429)) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        throw err;
      }
    }
    if (lastErr) throw lastErr;

    // 5. Build tool_calls from response.automaticFunctionCallingHistory
    const tool_calls = [];
    const history = response.automaticFunctionCallingHistory;

    if (Array.isArray(history)) {
      for (let i = 0; i < history.length; i++) {
        const item = history[i];
        if (!item?.parts || !Array.isArray(item.parts)) continue;

        for (const part of item.parts) {
          if (part.functionCall) {
            const { name, args } = part.functionCall;
            let failed = false;

            // Look forward for matching functionResponse
            for (let j = i + 1; j < history.length; j++) {
              const respItem = history[j];
              if (!respItem?.parts || !Array.isArray(respItem.parts)) continue;
              const respPart = respItem.parts.find(
                (p) => p.functionResponse && p.functionResponse.name === name
              );
              if (respPart) {
                const respObj = respPart.functionResponse.response;
                if (respObj) {
                  if (respObj.error || respObj.isError) {
                    failed = true;
                  } else if (typeof respObj === 'object') {
                    const str = JSON.stringify(respObj);
                    if (str.includes('"isError":true') || str.includes('"error":')) {
                      failed = true;
                    }
                  }
                }
                break;
              }
            }

            tool_calls.push({
              name,
              args: args || {},
              failed,
            });
          }
        }
      }
    }

    sendJson(res, 200, {
      answer: response.text,
      tool_calls,
      unavailable,
      model: 'gemini-3.8-flash',
      answered_at: new Date().toISOString(),
    });
  } catch (geminiErr) {
    const status = geminiErr?.status || 502;
    let reason =
      geminiErr?.message || String(geminiErr) || 'Gemini model execution failed';
    try {
      const parsed = JSON.parse(reason);
      if (parsed?.error?.message) {
        reason = parsed.error.message;
      }
    } catch {}
    reason = reason.split('\n')[0].trim();

    sendJson(res, 502, {
      status,
      reason,
      error: reason,
    });
  } finally {
    // 6. Close every client
    await Promise.allSettled(
      allClients.map(async (client) => {
        try {
          await client.close();
        } catch {}
      })
    );
  }
}
