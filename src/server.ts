import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WeatherService } from './services/WeatherService.js';
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
  private weatherService: WeatherService;
  private clients = new Set<Response>();

  constructor() {
    this.weatherService = new WeatherService(config.openWeatherApiKey);
    this.setupRoutes();
  }

  private setupRoutes() {
    // API info route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        message: 'Weather API is running',
        endpoints: {
          weather: '/weather'
        }
      });
    });

    // Weather SSE endpoint
    this.app.get('/weather', (req: Request, res: Response) => {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Store client connection
      this.clients.add(res);

      // Handle client disconnect
      req.on('close', () => {
        this.clients.delete(res);
        console.log('Client disconnected');
      });

      console.log('Client connected');

      // Send initial connection success message
      this.sendEvent(res, 'connected', { message: 'Connected successfully' });
    });

    // Weather request endpoint
    this.app.get('/weather/:city', async (req: Request, res: Response) => {
      const city = req.params.city;
      try {
        const weather = await this.weatherService.getWeather(city);
        // Send weather update to all connected clients
        for (const client of this.clients) {
          this.sendEvent(client, 'weather', {
            id: Date.now().toString(),
            result: weather
          });
        }
        res.json({ status: 'ok', message: 'Weather request processed' });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Weather service error'
        });
      }
    });
  }

  private sendEvent(res: Response, event: string, data: any) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  async start(port: number = config.port) {
    return new Promise<void>((resolve) => {
      this.server.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
        console.log(`SSE endpoint available at http://localhost:${port}/weather`);
        resolve();
      });
    });
  }

  async stop() {
    // Close all client connections
    for (const res of this.clients) {
      res.end();
    }
    this.clients.clear();

    return new Promise<void>((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
