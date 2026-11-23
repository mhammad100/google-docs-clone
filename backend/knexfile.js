const env = require('./src/config/env');

module.exports = {
  client: 'pg',
  connection: {
    connectionString: env.databaseUrl,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
  },
  // Small pool: the API also runs as a Vercel serverless function
  pool: { min: 0, max: 5 },
  migrations: { directory: './src/db/migrations' },
  seeds: { directory: './src/db/seeds' },
};
