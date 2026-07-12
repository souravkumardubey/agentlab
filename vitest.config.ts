import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@agentlab/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@agentlab/database': path.resolve(__dirname, 'packages/database/src'),
      '@agentlab/auth': path.resolve(__dirname, 'packages/auth/src'),
      '@agentlab/llm': path.resolve(__dirname, 'packages/llm/src'),
      '@agentlab/agents': path.resolve(__dirname, 'packages/agents/src'),
      '@agentlab/rag': path.resolve(__dirname, 'packages/rag/src'),
      '@agentlab/queue': path.resolve(__dirname, 'packages/queue/src'),
    },
  },
});
