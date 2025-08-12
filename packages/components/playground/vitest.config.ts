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
    server: {
        port: 3001,
        open: true,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'src/test/', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        },
    },
});
