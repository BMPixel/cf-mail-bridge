import { beforeAll, afterEach, afterAll } from 'vitest';

// Mock crypto for Node.js environment
if (typeof crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  (globalThis as any).crypto = webcrypto;
}

beforeAll(async () => {
  console.log('Test environment initialized');
});

afterEach(async () => {
  // Test cleanup
});

afterAll(async () => {
  console.log('Test environment cleaned up');
});