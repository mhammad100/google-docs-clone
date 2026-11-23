// Runs once before the test suite: rebuilds the test database schema from migrations.
module.exports = async () => {
  if (process.env.SKIP_DB_SETUP) return; // unit tests only (npm run test:unit)

  process.env.NODE_ENV = 'test';
  const knex = require('knex')(require('../knexfile'));
  await knex.migrate.rollback(undefined, true);
  await knex.migrate.latest();
  await knex.destroy();
};
