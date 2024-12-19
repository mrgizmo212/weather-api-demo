import express from 'express';
import { Server } from './mcp/server.js';
import { SSEServerTransport } from './mcp/sse.js';
import { WeatherService } from './services/WeatherService.js';
import { config } from './config.js';

const app = express();
const weatherService = new WeatherService(config.openWeatherApiKey);

// Track active sessions
const sessions = new Map<string, SSEServerTransport>();

// Create MCP server
const server = new Server(
  {
    name: 'weather-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Set up tool handlers
server.setRequestHandler('ListToolsRequest', async () => ({
  tools: [
    {
      name: 'get_weather',
      description: 'Get current weather for a city',
      inputSchema: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name',
          },
        },
        required: ['city'],
      },
    },
  ],
}));

server.setRequestHandler('CallToolRequest', async (request) => {
  if (request.params.name !== 'get_weather') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { city } = request.params.arguments;
  try {
    const weather = await weatherService.getWeather(city);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(weather, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Weather service error');
  }
});

// Set up routes
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Weather API is running',
    endpoints: {
      sse: '/weather',
      message: '/message'
    }
  });
});

// SSE endpoint
app.get('/weather', async (req, res) => {
  console.log('Client connected');
  const transport = new SSEServerTransport('/message', res);
  
  // Store transport in sessions map
  sessions.set(transport.sessionId, transport);
  
  // Clean up on close
  transport.onclose = () => {
    sessions.delete(transport.sessionId);
  };

  await server.connect(transport);
});

// Message endpoint
app.post('/message', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sessions.get(sessionId);
  
  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// Start server
const portStr = process.env.PORT || config.port.toString();
const port = parseInt(portStr, 10);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`SSE endpoint available at http://localhost:${port}/weather`);
});
