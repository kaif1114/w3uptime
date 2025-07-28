import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/lsu-lmu',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
  mixpanelToken: process.env.MIXPANEL_TOKEN || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:4400'],
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
};

export default config; 