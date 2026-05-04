module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  setupFiles: ['./tests/env.setup.js'],
  globals: {
    FC_NUM_RUNS: 100,
  },
  testTimeout: 30000,
};
