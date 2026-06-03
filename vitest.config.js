import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // happy-dom gives us localStorage + document so the app modules
    // (which assume a browser) load and run without changes.
    environment: 'happy-dom',
    // Pin timezone so date-formatting assertions are deterministic across
    // local machines and CI runners (which differ in TZ).
    env: { TZ: 'UTC' },
    include: ['tests/**/*.test.js'],
    clearMocks: true,
    restoreMocks: true
  }
});
