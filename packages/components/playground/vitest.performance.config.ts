/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@promptbook/components': path.resolve(__dirname, '../esm'),
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['**/*.perf.test.{ts,tsx}'],
        testTimeout: 10000,
        hookTimeout: 10000,
        reporter: ['verbose', 'json'],
        outputFile: './benchmarks/performance-results.json',
    },
});
