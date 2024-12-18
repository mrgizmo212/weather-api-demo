import axios from 'axios';

interface WeatherResponse {
  temperature: number;
  conditions: string;
  humidity: number;
  wind_speed: number;
  city: string;
}

export class WeatherService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getWeather(city: string): Promise<WeatherResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric' // Use Celsius for temperature
        }
      });

      const data = response.data;
      
      return {
        temperature: Math.round(data.main.temp),
        conditions: data.weather[0].description,
        humidity: data.main.humidity,
        wind_speed: Math.round(data.wind.speed),
        city: data.name
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`City '${city}' not found`);
        }
        throw new Error(`Weather API error: ${error.response?.data.message || error.message}`);
      }
      throw error;
    }
  }
}
