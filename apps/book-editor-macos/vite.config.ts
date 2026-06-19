import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: './',
    root: path.resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: {
        alias: {
            // [🔁] Map the local package aliases used throughout the repo to their source files
            '@promptbook-local/components': path.resolve(__dirname, '../../src/_packages/components.index.ts'),
            '@promptbook-local/types': path.resolve(__dirname, '../../src/_packages/types.index.ts'),
        },
    },
    build: {
        outDir: path.resolve(__dirname, 'dist/renderer'),
        emptyOutDir: true,
    },
    server: {
        port: 5174,
    },
    optimizeDeps: {
        include: ['@monaco-editor/react', 'monaco-editor'],
    },
});
