export const config = {
  // Server configuration
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  host: process.env.HOST || 'localhost',
  
  // Security configuration
  secretKey: process.env.SECRET_KEY || 'your-secret-key-here',
  
  // OpenWeather API configuration
  openWeatherApiKey: 'b3cbecae675ff67a3debfbc15d436a43',
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Client configuration
  clientTimeout: 30000, // 30 seconds
  maxPayloadSize: 1024 * 1024 // 1MB
};

// Type definitions for configuration
export interface Config {
  port: number;
  host: string;
  secretKey: string;
  openWeatherApiKey: string;
  rateLimit: {
    windowMs: number;
    max: number;
  };
  clientTimeout: number;
  maxPayloadSize: number;
}

// Validate configuration
function validateConfig(config: Config): void {
  if (!config.secretKey || config.secretKey === 'your-secret-key-here') {
    console.warn('Warning: Using default secret key. This is not secure for production!');
  }
  
  if (!config.openWeatherApiKey) {
    throw new Error('OpenWeather API key is required');
  }
}

// Validate on import
validateConfig(config);
