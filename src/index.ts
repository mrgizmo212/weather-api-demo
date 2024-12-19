// src/server.ts
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { WeatherService } from './services/WeatherService.js';
import { config } from './config.js';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Create Express app
const app = express();

// Initialize services
const weatherService = new WeatherService(config.openWeatherApiKey);

// Initialize MCP server and transport
const server = new Server(
  {
    name: "weather-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

let transport: SSEServerTransport;

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

// Set up handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "get_weather") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = z.object({
    city: z.string()
  }).parse(request.params.arguments);

  try {
    const weather = await weatherService.getWeather(args.city);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(weather, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
});

// Set up Express routes
app.get("/sse", async (_req, res) => {
  console.log("New SSE connection received");
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);

  server.onclose = async () => {
    console.log("Server connection closed");
    await server.close();
  };
});

app.post("/message", async (req, res) => {
  console.log("Received message");
  await transport.handlePostMessage(req, res);
});

// Start server
const port = config.port;
app.listen(port, () => {
  console.log(`MCP Weather Server running on port ${port}`);
  console.log(`SSE endpoint: http://localhost:${port}/sse`);
});