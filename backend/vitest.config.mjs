import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: { NODE_ENV: 'test' },
    globalSetup: './tests/globalSetup.js',
    // API tests share one database, so run files one at a time
    fileParallelism: false,
  },
});
