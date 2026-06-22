import { defineConfig } from 'vite';

export default defineConfig({
  base: '/overthink-o-matic/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
  },
});
