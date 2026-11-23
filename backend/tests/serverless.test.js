const path = require('path');
const { spawnSync } = require('child_process');

// Vercel's runtime can't require() ES modules. This runs the API in a separate Node
// process with that feature switched off, so an ESM-only dependency fails the test suite
// instead of crashing the deployed function. See scripts/verify-serverless.js.
describe('serverless deployment', () => {
  it('loads and runs the API without require(esm)', () => {
    const script = path.resolve(__dirname, '../scripts/verify-serverless.js');
    const result = spawnSync(process.execPath, ['--no-experimental-require-module', script], {
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, NODE_ENV: 'production' },
    });

    expect(result.stderr).not.toMatch(/ERR_REQUIRE_ESM/);
    expect(result.stdout).toContain('OK: API loads and runs without require(esm)');
    expect(result.status).toBe(0);
  });
});
