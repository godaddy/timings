// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  test: {
    // Vitest configuration options
    globals: true,
    restoreMocks: true,
    setupFiles: 'test/setup/add-globals.js',
    environment: 'node', // or 'node' depending on your project
    exclude: ['node_modules', '.vscode/**'],
    files: 'test/**/*.test.js',
  },
  coverage: {
    // Enable coverage reporting
    enabled: true,
    // Configure reporters as needed (text, lcov, html, etc.)
    reporter: ['text', 'lcov', 'html'],
    // Include and exclude patterns for coverage
    include: ['src/**/*.js'],
    exclude: ['**/*.test.js'],
    // Additional c8 options
    // For example, to enforce minimum coverage thresholds
    // branches: 80,
    // functions: 80,
    // lines: 80,
    // statements: 80,
  },
});
