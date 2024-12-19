import express, { Request, Response } from 'express';
import { Server } from './mcp/server.js';
import { SSEServerTransport } from './mcp/sse.js';
import { WeatherService } from './services/WeatherService.js';
import { config } from './config.js';

export class WeatherServer {
  private app = express();
  private weatherService: WeatherService;
  private mcpServer: Server;
  private transport?: SSEServerTransport;

  constructor() {
    this.weatherService = new WeatherService(config.openWeatherApiKey);
    this.mcpServer = new Server(
      {
        name: 'weather-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {
            get_weather: {
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
          },
        },
      }
    );

    this.setupMcpHandlers();
    this.setupRoutes();
  }

  private setupMcpHandlers() {
    this.mcpServer.setRequestHandler('ListToolsRequest', async () => ({
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

    this.mcpServer.setRequestHandler('CallToolRequest', async (request) => {
      if (request.params.name !== 'get_weather') {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      const { city } = request.params.arguments;
      try {
        const weather = await this.weatherService.getWeather(city);
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

    // Error handling
    this.mcpServer.onerror = (error) => console.error('[MCP Error]', error);
  }

  private setupRoutes() {
    // API info route
    this.app.get('/', (req: Request, res: Response) => {
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
    this.app.get('/weather', async (req: Request, res: Response) => {
      console.log('Client connected');
      this.transport = new SSEServerTransport('/message', res);
      await this.mcpServer.connect(this.transport);

      // Handle server close
      this.mcpServer.onclose = async () => {
        await this.mcpServer.close();
      };
    });

    // Message endpoint for SSE transport
    this.app.post('/message', async (req: Request, res: Response) => {
      if (!this.transport) {
        return res.status(400).json({ error: 'No SSE connection established' });
      }
      const message = req.body;
      if (!message || typeof message !== 'object') {
        return res.status(400).json({ error: 'Invalid message format' });
      }

      try {
        const result = await this.mcpServer.handleMessage(message);
        await this.transport.handlePostMessage(req, res);
      } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  async start(port: number = config.port) {
    return new Promise<void>((resolve) => {
      this.app.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
        console.log(`SSE endpoint available at http://localhost:${port}/weather`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.transport) {
      await this.mcpServer.close();
    }
  }
}
