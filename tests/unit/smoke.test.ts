import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('environment is configured', () => {
    expect(true).toBe(true);
  });

  it('node version supports ESM imports', async () => {
    const mod = await import('node:path');
    expect(typeof mod.join).toBe('function');
  });
});
