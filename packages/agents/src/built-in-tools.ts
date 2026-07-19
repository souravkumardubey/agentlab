/**
 * Built-in tools for agents.
 *
 * These tools are registered by default and available to all agents
 * when enabled in their configuration.
 */

import type { ToolDefinition } from './tools';
import { registerTools } from './tools';

// ==================== Calculator ====================

const calculatorTool: ToolDefinition = {
  name: 'calculator',
  description: 'Evaluate a mathematical expression. Supports basic arithmetic (+, -, *, /), exponents (**), parentheses, and common math functions (sqrt, abs, min, max, floor, ceil, round, log, sin, cos, tan).',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate. Examples: "2 + 2", "sqrt(144)", "(15 * 3) / 5", "2 ** 10"',
      },
    },
    required: ['expression'],
  },
  execute: async (args) => {
    const expression = String(args.expression || '');

    // Sanitize: only allow numbers, operators, parentheses, math functions, spaces, dots
    const sanitized = expression.replace(/\s/g, '');
    if (!/^[0-9+\-*/().,%^a-zA-Z]+$/.test(sanitized)) {
      return 'Error: Expression contains invalid characters.';
    }

    // Map math function names to Math.* methods
    const mathFunctions: Record<string, string> = {
      sqrt: 'Math.sqrt',
      abs: 'Math.abs',
      min: 'Math.min',
      max: 'Math.max',
      floor: 'Math.floor',
      ceil: 'Math.ceil',
      round: 'Math.round',
      log: 'Math.log',
      log10: 'Math.log10',
      log2: 'Math.log2',
      sin: 'Math.sin',
      cos: 'Math.cos',
      tan: 'Math.tan',
      PI: 'Math.PI',
      E: 'Math.E',
      pow: 'Math.pow',
    };

    let evalExpression = sanitized;
    for (const [name, replacement] of Object.entries(mathFunctions)) {
      evalExpression = evalExpression.replace(new RegExp(`\\b${name}\\b`, 'g'), replacement);
    }

    // Security: only allow safe characters after mapping
    if (!/^[0-9+\-*/().,%\s]+$/.test(evalExpression.replace(/Math\.\w+/g, ''))) {
      return 'Error: Expression contains invalid operations.';
    }

    try {
      // Use Function constructor instead of eval for slightly better isolation
      const fn = new Function(`"use strict"; return (${evalExpression});`);
      const result = fn();

      if (typeof result !== 'number' || !isFinite(result)) {
        return `Error: Expression did not produce a valid number. Result: ${String(result)}`;
      }

      return String(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error evaluating expression: ${msg}`;
    }
  },
};

// ==================== Current DateTime ====================

const currentDateTimeTool: ToolDefinition = {
  name: 'get_current_datetime',
  description: 'Get the current date and time. Optionally specify a timezone (e.g., "America/New_York", "UTC", "Europe/London").',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'IANA timezone name (e.g., "America/New_York", "UTC", "Asia/Tokyo"). Defaults to UTC.',
      },
    },
    required: [],
  },
  execute: async (args) => {
    try {
      const timezone = String(args.timezone || 'UTC');
      const now = new Date();

      const formatted = now.toLocaleString('en-US', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });

      return JSON.stringify({
        datetime: formatted,
        iso: now.toISOString(),
        timezone,
        timestamp: now.getTime(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error getting datetime: ${msg}`;
    }
  },
};

// ==================== HTTP Request ====================

const httpRequestTool: ToolDefinition = {
  name: 'http_request',
  description: 'Make an HTTP request to a URL. Supports GET, POST, PUT, DELETE, PATCH methods. Returns the response body as text. Useful for calling external APIs.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to send the request to.',
      },
      method: {
        type: 'string',
        description: 'HTTP method to use.',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
      headers: {
        type: 'string',
        description: 'JSON string of headers to send. Example: \'{"Content-Type": "application/json"}\'',
      },
      body: {
        type: 'string',
        description: 'Request body (for POST/PUT/PATCH). Will be sent as-is.',
      },
    },
    required: ['url', 'method'],
  },
  execute: async (args) => {
    const url = String(args.url || '');
    const method = String(args.method || 'GET').toUpperCase();

    // Security: only allow http/https URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'Error: Only HTTP and HTTPS URLs are allowed.';
    }

    // Block internal/private IPs for security
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        return 'Error: Requests to internal/private addresses are not allowed.';
      }
    } catch {
      return 'Error: Invalid URL.';
    }

    try {
      let parsedHeaders: Record<string, string> = {};
      if (args.headers) {
        try {
          parsedHeaders = JSON.parse(String(args.headers));
        } catch {
          return 'Error: Invalid headers JSON.';
        }
      }

      const fetchOptions: RequestInit = {
        method,
        headers: parsedHeaders,
        signal: AbortSignal.timeout(15000), // 15 second timeout
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && args.body) {
        fetchOptions.body = String(args.body);
      }

      const response = await fetch(url, fetchOptions);
      const text = await response.text();

      // Truncate very long responses
      const maxLen = 5000;
      const truncated = text.length > maxLen ? text.slice(0, maxLen) + '... [truncated]' : text;

      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: truncated,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('timeout') || msg.includes('AbortError')) {
        return 'Error: Request timed out after 15 seconds.';
      }
      return `Error making HTTP request: ${msg}`;
    }
  },
};

// ==================== Web Search (Placeholder) ====================

const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web for information. Returns a list of search results with titles, URLs, and snippets. Requires a search API key (SERPAPI_KEY or BRAVE_API_KEY) to be configured.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query.',
      },
      num_results: {
        type: 'string',
        description: 'Number of results to return (1-10). Default: 5.',
      },
    },
    required: ['query'],
  },
  execute: async (args) => {
    const query = String(args.query || '');
    const numResults = Math.min(10, Math.max(1, parseInt(String(args.num_results || '5'), 10) || 5));

    // Try Brave Search API
    const braveKey = process.env.BRAVE_API_KEY;
    if (braveKey) {
      try {
        const response = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${numResults}`,
          {
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip',
              'X-Subscription-Token': braveKey,
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!response.ok) {
          return `Error: Brave Search API returned status ${response.status}`;
        }

        const data = await response.json() as {
          web?: {
            results?: Array<{
              title: string;
              url: string;
              description: string;
            }>;
          };
        };

        const results = data.web?.results || [];
        if (results.length === 0) {
          return 'No search results found.';
        }

        return JSON.stringify(
          results.map((r, i) => ({
            rank: i + 1,
            title: r.title,
            url: r.url,
            snippet: r.description,
          })),
          null,
          2
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return `Error searching the web: ${msg}`;
      }
    }

    // Try SERPAPI
    const serpKey = process.env.SERPAPI_KEY;
    if (serpKey) {
      try {
        const response = await fetch(
          `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=${numResults}&api_key=${serpKey}`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (!response.ok) {
          return `Error: SERPAPI returned status ${response.status}`;
        }

        const data = await response.json() as {
          organic_results?: Array<{
            title: string;
            link: string;
            snippet: string;
          }>;
        };

        const results = data.organic_results || [];
        if (results.length === 0) {
          return 'No search results found.';
        }

        return JSON.stringify(
          results.slice(0, numResults).map((r, i) => ({
            rank: i + 1,
            title: r.title,
            url: r.link,
            snippet: r.snippet,
          })),
          null,
          2
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return `Error searching the web: ${msg}`;
      }
    }

    return 'No search API configured. Set BRAVE_API_KEY or SERPAPI_KEY environment variable.';
  },
};

// ==================== Register All Built-in Tools ====================

export function registerBuiltInTools(): void {
  registerTools([
    calculatorTool,
    currentDateTimeTool,
    httpRequestTool,
    webSearchTool,
  ]);
}

export { calculatorTool, currentDateTimeTool, httpRequestTool, webSearchTool };
