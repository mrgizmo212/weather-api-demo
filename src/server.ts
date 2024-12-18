import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WeatherService } from './services/WeatherService.js';
import { AuthManager } from './auth/AuthManager.js';
import { config } from './config.js';

interface Message {
  id: string;
  type: string;
  params: {
    name: string;
    arguments: any;
  };
}

export class WeatherServer {
  private app = express();
  private server = createServer(this.app);
  private wss = new WebSocketServer({ server: this.server });
  private weatherService: WeatherService;
  private authManager: AuthManager;

  constructor() {
    this.weatherService = new WeatherService(config.openWeatherApiKey);
    this.authManager = new AuthManager(config.secretKey);
    
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes() {
    // API info route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        message: 'Weather API is running',
        endpoints: {
          register: 'POST /register'
        }
      });
    });

    // Register route
    this.app.post('/register', express.json(), (req: Request, res: Response) => {
      const { clientId } = req.body;
      if (!clientId) {
        return res.status(400).json({ error: 'clientId is required' });
      }

      const apiKey = this.authManager.generateApiKey(clientId);
      res.json({ apiKey });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      // Get token from Authorization header
      const authHeader = req.headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        ws.close(1008, 'Invalid authentication');
        return;
      }

      const apiKey = authHeader.substring(7);
      const clientId = this.authManager.validateApiKey(apiKey);
      if (!clientId) {
        ws.close(1008, 'Invalid API key');
        return;
      }

      console.log(`Client connected: ${clientId}`);

      ws.on('message', async (data: Buffer | ArrayBuffer | Buffer[]) => {
        try {
          const message = JSON.parse(data.toString()) as Message;
          const response = await this.handleMessage(message);
          ws.send(JSON.stringify({
            id: message.id,
            ...response
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });

      ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
      });
    });
  }

  private async handleMessage(message: Message) {
    if (message.type !== 'CallTool') {
      throw new Error(`Unknown message type: ${message.type}`);
    }

    if (message.params.name === 'get_weather') {
      try {
        const { city } = message.params.arguments;
        const weather = await this.weatherService.getWeather(city);
        return {
          result: weather
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Weather service error');
      }
    }

    throw new Error(`Unknown tool: ${message.params.name}`);
  }

  async start(port: number = config.port) {
    return new Promise<void>((resolve) => {
      this.server.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
        console.log(`WebSocket server running on ws://localhost:${port}`);
        console.log('To register a client, send a POST request to /register with {"clientId": "your-client-id"}');
        resolve();
      });
    });
  }

  async stop() {
    return new Promise<void>((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
