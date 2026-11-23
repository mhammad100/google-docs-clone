const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../', process.env.NODE_ENV === 'test' ? '.env.test' : '.env'),
  quiet: true,
});

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma separated list of allowed frontend origins
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  maxUploadBytes: 1024 * 1024, // 1 MB
};

if (!env.databaseUrl) throw new Error('DATABASE_URL is not set');
if (!env.jwtSecret) throw new Error('JWT_SECRET is not set');

module.exports = env;
