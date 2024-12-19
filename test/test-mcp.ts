import fetch from 'node-fetch';
import EventSource from 'eventsource';

async function testMcp() {
  // Connect to SSE endpoint
  console.log('Connecting to SSE endpoint...');
  const es = new EventSource('https://weather-api-demo-x31r.onrender.com/weather');

  es.onopen = () => {
    console.log('Connected to SSE endpoint');
  };

  es.onerror = (error) => {
    console.error('SSE connection error:', error);
  };

  // Listen for messages
  es.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Send tool request
  console.log('\nSending tool request...');
  const response = await fetch('https://weather-api-demo-x31r.onrender.com/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: '1',
      type: 'CallToolRequest',
      params: {
        name: 'get_weather',
        arguments: {
          city: 'London'
        }
      }
    })
  });

  console.log('Response status:', response.status);
  console.log('Response:', await response.json());

  // Keep connection open to receive SSE events
  console.log('\nWaiting for weather data...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Cleanup
  es.close();
  console.log('\nTest complete');
}

testMcp().catch(console.error);
