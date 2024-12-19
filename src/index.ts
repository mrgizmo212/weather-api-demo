/**
 * Weather Server Implementation using the Model Context Protocol (MCP)
 * 
 * This server demonstrates how to create an MCP Server that provides
 * weather data through tools that can be called by MCP Clients.
 * 
 * The server uses Server-Sent Events (SSE) Transport, for remote scalability,
 * allowing for bidirectional communication where:
 * - Server -> Client: Uses SSE for streaming updates
 * - Client -> Server: Uses HTTP POST for sending messages
 */

import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { WeatherService } from './services/WeatherService.js';
import { config } from './config.js';
import {
  Tool,                    // Type definition for MCP tools
  ListToolsRequestSchema,  // Schema for tool listing requests
  CallToolRequestSchema,   // Schema for tool execution requests
  CallToolResultSchema     // Schema for tool execution responses
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";   // Runtime type checking library

// Initialize Express application for handling HTTP requests
const app = express();

// Custom logic: Initialize the weather service with our API key
const weatherService = new WeatherService(config.openWeatherApiKey);

/**
 * Initialize the MCP Server
 * 
 * The Server class is the core of MCP, handling:
 * - Protocol negotiation with clients
 * - Message routing
 * - Capability advertisement
 * - Request/response lifecycle
 */
const server = new Server(
  {
    name: "weather-server",    // Server identifier
    version: "1.0.0",         // Server version
  },
  {
    capabilities: {
      tools: {},              // Advertise that we support tools
      resources: {},          // Required for some clients
    },
  }
);

/**
 * Transport instance for handling SSE communication
 * 
 * SSEServerTransport manages:
 * - SSE connection lifecycle
 * - Message serialization/deserialization
 * - Session management
 * - Request/response routing
 */
let transport: SSEServerTransport;

/**
 * Tool Definitions
 * 
 * Tools are the primary way for clients to trigger actions on our server.
 * Each tool has:
 * - name: Unique identifier
 * - description: Helps the AI understand when to use the tool
 * - inputSchema: JSON Schema defining expected parameters (descriptions help AI)
 */
const tools: Tool[] = [{
  name: "get_weather",
  description: "Get current weather for a city",
  inputSchema: {
    type: "object",
    properties: {
      city: {
        type: "string",
        description: "City name"
      }
    },
    required: ["city"]
  }
}];

/**
 * Handle tool listing requests
 * 
 * When a client wants to know what tools are available, it calls
 * the 'tools/list' endpoint. We respond with our tool definitions.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

/**
 * Handle tool execution requests
 * 
 * When the client wants to use a tool, it sends a
 * 'tools/call' request. This handler:
 * 1. Validates the tool exists
 * 2. Validates the input parameters
 * 3. Executes the tool
 * 4. Returns the result or error
 * 

**MCP Error Handling**
MCP handles errors at two levels:
- Protocol level: Thrown errors auto-convert to JSON-RPC error responses with codes
- Tool level: Return errors as content with `isError: true` for AI-friendly handling

Use protocol errors for infrastructure issues, content errors for business logic the AI should handle.

 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: _args } = request.params;
  /** Note: every tool must be handled within this request handler */
  if (name === "get_weather") {
    // Validate tool arguments using Zod
    const args = z.object({
      city: z.string()
    }).parse(_args);

    try {
      // Execute the tool logic
      const weather = await weatherService.getWeather(args.city);
      
      // Return success response, note the use of CallToolResultSchema.parse()
      // to ensure the response matches the expected schema
      return CallToolResultSchema.parse({
        content: [{
          type: "text",
          text: JSON.stringify(weather, null, 2)
        }]
      });
    } catch (error) {
      // Return error response
      // Note: We return errors as content so the client can handle them
      return CallToolResultSchema.parse({
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      });
    }
  }

  throw new Error(`Tool ${name} not found`);
});

/**
 * SSE Connection Endpoint
 * 
 * When a client wants to connect, it:
 * 1. Makes a GET request to /sse
 * 2. Receives a session ID and message endpoint
 * 3. Maintains an open connection for receiving updates
 */
app.get("/sse", async (_req, res) => {
  console.log("New SSE connection received");
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);

  // Clean up when connection closes
  server.onclose = async () => {
    console.log("Server connection closed");
    await server.close();
  };
});

/**
 * Message Handling Endpoint
 * 
 * Clients send messages (like tool calls) via POST requests.
 * The transport handles:
 * - Message parsing
 * - Session validation
 * - Response routing
 */
app.post("/message", async (req, res) => {
  console.log("Received message");
  await transport.handlePostMessage(req, res);
});

// Start the HTTP server
const port = config.port;
app.listen(port, () => {
  console.log(`MCP Weather Server running on port ${port}`);
  console.log(`SSE endpoint: http://localhost:${port}/sse`);
});