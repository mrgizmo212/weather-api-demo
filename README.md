# Weather API WebSocket Demo

A real-time weather information service using WebSocket, with the OpenWeatherMap API.

## Features

- Real-time weather data using WebSocket connections
- Secure API key authentication
- Support for multiple simultaneous clients
- Error handling and automatic reconnection
- TypeScript implementation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm run dev
```

3. In a separate terminal, run the test client:
```bash
npm run test
```

## How It Works

1. The server exposes two main interfaces:
   - HTTP endpoint for client registration (`/register`)
   - WebSocket endpoint for real-time weather data

2. Client Registration:
   - Send a POST request to `/register` with your client ID
   - Receive an API key for WebSocket authentication

3. WebSocket Connection:
   - Connect to the WebSocket server with your API key
   - Send weather requests for any city
   - Receive real-time weather updates

## Example Usage

```typescript
// Register a client
const registration = await axios.post('http://localhost:3000/register', {
  clientId: 'my-client'
});
const apiKey = registration.data.apiKey;

// Connect to WebSocket
const client = new WeatherClient('ws://localhost:3000');
await client.connect(apiKey);

// Get weather for a city
const weather = await client.getWeather('London');
console.log('Weather:', weather.result);
```

## Weather Response Format

```json
{
  "temperature": 22,
  "conditions": "clear sky",
  "humidity": 65,
  "wind_speed": 5,
  "city": "London"
}
```

## Error Handling

The server handles various error cases:
- Invalid API keys
- City not found
- Network errors
- Rate limiting

## Security

- API key authentication for all WebSocket connections
- Rate limiting to prevent abuse
- Input validation
- Error message sanitization

## Environment Variables

You can customize the server using environment variables:
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: localhost)
- `SECRET_KEY`: For API key generation

## Development

- Built with TypeScript
- Uses Express for HTTP endpoints
- WebSocket for real-time communication
- OpenWeatherMap API for weather data

## Testing

Run the included test client to verify functionality:
```bash
npm run test
```

This will test:
- Client registration
- WebSocket connection
- Weather queries for multiple cities
- Error handling
