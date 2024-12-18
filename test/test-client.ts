import WebSocket from 'ws';
import axios from 'axios';

class WeatherClient {
  private ws: WebSocket | null = null;
  private messageQueue: Map<string, (response: any) => void> = new Map();

  constructor(private url: string) {}

  async connect(apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      this.ws.on('open', () => {
        console.log('Connected to server');
        resolve();
      });

      this.ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        if (response.id) {
          const resolver = this.messageQueue.get(response.id);
          if (resolver) {
            resolver(response);
            this.messageQueue.delete(response.id);
          }
        }
      });

      this.ws.on('error', reject);
    });
  }

  async getWeather(city: string): Promise<any> {
    if (!this.ws) throw new Error('Not connected');

    const messageId = Math.random().toString(36).substring(7);
    const message = {
      id: messageId,
      type: 'CallTool',
      params: {
        name: 'get_weather',
        arguments: { city }
      }
    };

    return new Promise((resolve) => {
      this.messageQueue.set(messageId, resolve);
      this.ws!.send(JSON.stringify(message));
    });
  }

  close() {
    this.ws?.close();
  }
}

async function main() {
  try {
    // First, register a client and get an API key
    console.log('Registering client...');
    const registration = await axios.post('http://localhost:3000/register', {
      clientId: 'test-client'
    });
    const apiKey = registration.data.apiKey;
    console.log('Got API key:', apiKey);

    // Create and connect client
    const client = new WeatherClient('ws://localhost:3000');
    await client.connect(apiKey);

    // Test with some cities
    const cities = ['London', 'New York', 'Tokyo', 'Paris', 'Sydney'];
    
    for (const city of cities) {
      console.log(`\nGetting weather for ${city}...`);
      const response = await client.getWeather(city);
      console.log('Weather:', response.result);
    }

    // Test with an invalid city
    try {
      console.log('\nTesting with invalid city...');
      const response = await client.getWeather('NonExistentCity');
      console.log('Weather:', response.result);
    } catch (error) {
      console.error('Error (expected):', error instanceof Error ? error.message : error);
    }

    client.close();
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// Only run if this file is being run directly
if (process.argv[1] === import.meta.url.substring(7)) {
  main();
}
