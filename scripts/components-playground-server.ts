#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import express from 'express';
import { readFile } from 'fs';
import { createServer } from 'http';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import * as ts from 'typescript';
import { promisify } from 'util';
import { forEver } from 'waitasecond';
import { assertsError } from '../src/errors/assertsError';

const readFileAsync = promisify(readFile);

/**
 * Transpiles TypeScript/TSX code to JavaScript that can run in the browser
 */
function transpileComponent(sourceCode: string): string {
    try {
        // Remove imports and exports that won't work in browser
        let processedCode = sourceCode
            // Remove import statements
            .replace(/import\s+.*?from\s+['"][^'"]*['"];?\s*/g, '')
            // Remove 'use client' directive
            .replace(/'use client';\s*/g, '')
            // Remove export keyword from function
            .replace(/export\s+function\s+BookEditor/g, 'function BookEditor')
            // Remove export keyword from interface
            .replace(/export\s+interface\s+BookEditorProps/g, 'interface BookEditorProps');

        // Add dependencies as global variables at the top
        const dependenciesCode = `
            // Mock dependencies for browser environment
            const DEFAULT_BOOK = \`# 🌟 Sample Book

-   BOOK VERSION 1.0.0
-   INPUT PARAMETER {topic}
-   OUTPUT PARAMETER {article}

## Write an Article

-   PERSONA Jane, marketing specialist with prior experience in tech and AI writing
-   KNOWLEDGE https://wikipedia.org/
-   EXPECT MIN 1 Sentence
-   EXPECT MAX 5 Pages

> Write an article about {topic}

→ {article}\`;

            function getAllCommitmentDefinitions() {
                return [
                    { type: 'PERSONA' }, { type: 'KNOWLEDGE' }, { type: 'STYLE' },
                    { type: 'RULE' }, { type: 'RULES' }, { type: 'SAMPLE' },
                    { type: 'EXAMPLE' }, { type: 'FORMAT' }, { type: 'MODEL' },
                    { type: 'ACTION' }, { type: 'META IMAGE' }, { type: 'META LINK' },
                    { type: 'NOTE' }, { type: 'EXPECT' }, { type: 'SCENARIO' },
                    { type: 'SCENARIOS' }, { type: 'BEHAVIOUR' }, { type: 'BEHAVIOURS' },
                    { type: 'AVOID' }, { type: 'AVOIDANCE' }, { type: 'GOAL' },
                    { type: 'GOALS' }, { type: 'CONTEXT' }, { type: 'BOOK VERSION' },
                    { type: 'INPUT PARAMETER' }, { type: 'OUTPUT PARAMETER' }
                ];
            }

            function validateBook(content) {
                return content; // Simplified validation for browser
            }

            // React imports (assuming React is loaded globally)
            const { useState, useCallback, useEffect, useMemo, useRef } = React;
        `;

        processedCode = dependenciesCode + '\n' + processedCode;

        // Use TypeScript compiler to transpile TSX to JS
        const result = ts.transpile(processedCode, {
            target: ts.ScriptTarget.ES2018,
            module: ts.ModuleKind.None,
            jsx: ts.JsxEmit.React,
            jsxFactory: 'React.createElement',
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
        });

        return result;
    } catch (error) {
        console.error('Error transpiling component:', error);
        throw error;
    }
}

if (process.cwd() !== join(__dirname, '..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

main()
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function main() {
    console.info(colors.bgCyan('🧸  Components Playground Server'));

    const app = express();
    const server = createServer(app);
    const port = 4461;

    // Middleware for parsing JSON and URL-encoded data
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Serve static files (for any CSS, JS, or assets we might need)
    app.use('/static', express.static(join(__dirname, '..', 'public')));

    // Serve the actual BookEditor component source
    app.get('/components/BookEditor/source', async (req, res) => {
        try {
            const componentPath = join(__dirname, '..', 'src', 'book-components', 'BookEditor', 'BookEditor.tsx');
            const componentSource = await readFileAsync(componentPath, 'utf-8');

            res.json({
                name: 'BookEditor',
                source: componentSource,
                path: componentPath,
                lastModified: new Date().toISOString(),
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to read BookEditor component',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });

    // Serve the transpiled BookEditor component for browser use
    app.get('/components/BookEditor/transpiled', async (req, res) => {
        try {
            const componentPath = join(__dirname, '..', 'src', 'book-components', 'BookEditor', 'BookEditor.tsx');
            const componentSource = await readFileAsync(componentPath, 'utf-8');

            const transpiledCode = transpileComponent(componentSource);

            res.set('Content-Type', 'application/javascript');
            res.send(transpiledCode);
        } catch (error) {
            console.error('Error transpiling BookEditor:', error);
            res.status(500).json({
                error: 'Failed to transpile BookEditor component',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });

    // API endpoint to get component information
    app.get('/api/components', (req, res) => {
        res.json({
            components: [
                {
                    name: 'BookEditor',
                    description: 'A React component for editing promptbook files with syntax highlighting',
                    location: 'src/book-components/BookEditor/BookEditor.tsx',
                    package: '@promptbook/components',
                    props: {
                        className: 'string (optional) - Additional CSS classes',
                        fontClassName: 'string (optional) - Font CSS class',
                        value: 'string_book (optional) - Controlled value of the book text',
                        onChange: 'function (optional) - Change handler',
                    },
                    example: spaceTrim(`
                        import { BookEditor } from '@promptbook/components';

                        function App() {
                          return (
                            <BookEditor
                              className="max-w-4xl mx-auto"
                              value={validateBook(\`
                                # Sample Book

                                - PERSONA Jane, a helpful assistant
                                - KNOWLEDGE Basic conversational skills

                                ## Greeting

                                > Hello! How can I help you today?

                                → {response}
                              \`)}
                            />
                          );
                        }
                    `),
                },
            ],
        });
    });

    // Main playground page
    app.get('/', (req, res) => {
        try {
            // Create the full HTML page with live React demo
            const html = spaceTrim(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Promptbook Components Playground</title>
                    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
                    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }

                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            padding: 20px;
                        }

                        .container {
                            max-width: 1200px;
                            margin: 0 auto;
                            background: white;
                            border-radius: 12px;
                            padding: 40px;
                            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                        }

                        h1 {
                            color: #333;
                            text-align: center;
                            margin-bottom: 30px;
                            font-size: 2.5rem;
                            font-weight: 700;
                        }

                        .subtitle {
                            text-align: center;
                            color: #666;
                            margin-bottom: 40px;
                            font-size: 1.2rem;
                        }

                        .component-info {
                            background: #f8f9fa;
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 30px;
                            border-left: 4px solid #667eea;
                        }

                        .component-info h2 {
                            margin-top: 0;
                            color: #333;
                        }

                        .component-info code {
                            background: #e9ecef;
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                        }

                        .playground-section {
                            margin-top: 40px;
                        }

                        .playground-section h2 {
                            color: #333;
                            margin-bottom: 20px;
                        }

                        .live-component-container {
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            padding: 20px;
                            background: #f9f9f9;
                            margin: 20px 0;
                            min-height: 300px;
                        }

                        .error-display {
                            background: #fee;
                            border: 1px solid #fcc;
                            padding: 15px;
                            border-radius: 8px;
                            color: #c44;
                            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                            white-space: pre-wrap;
                        }

                        .loading {
                            text-align: center;
                            color: #666;
                            padding: 40px;
                        }

                        .status-badge {
                            background: #28a745;
                            color: white;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: bold;
                        }

                        .live-badge {
                            background: #17a2b8;
                            color: white;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: bold;
                            margin-left: 10px;
                        }

                        .footer {
                            text-align: center;
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 1px solid #dee2e6;
                            color: #6c757d;
                        }

                        /* BookEditor specific styles - comprehensive Tailwind CSS classes */
                        .w-full { width: 100%; }
                        .relative { position: relative; }
                        .flex { display: flex; }
                        .flex-col { flex-direction: column; }
                        .gap-4 { gap: 1rem; }
                        .mb-4 { margin-bottom: 1rem; }
                        .resize-none { resize: none; }
                        .outline-none { outline: none; }
                        .font-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
                        .text-sm { font-size: 0.875rem; }
                        .text-lg { font-size: 1.125rem; }
                        .leading-relaxed { line-height: 1.625; }
                        .p-4 { padding: 1rem; }
                        .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
                        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
                        .pl-\\[46px\\] { padding-left: 46px; }
                        .pr-\\[46px\\] { padding-right: 46px; }
                        .border { border-width: 1px; }
                        .border-gray-300 { border-color: #d1d5db; }
                        .border-gray-300\\/80 { border-color: rgba(209, 213, 219, 0.8); }
                        .rounded-lg { border-radius: 0.5rem; }
                        .rounded-2xl { border-radius: 1rem; }
                        .bg-white { background-color: #ffffff; }
                        .bg-transparent { background-color: transparent; }
                        .text-transparent { color: transparent; }
                        .text-gray-900 { color: #111827; }
                        .text-gray-600 { color: #4b5563; }
                        .caret-gray-900 { caret-color: #111827; }
                        .absolute { position: absolute; }
                        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
                        .z-10 { z-index: 10; }
                        .z-20 { z-index: 20; }
                        .pointer-events-none { pointer-events: none; }
                        .overflow-auto { overflow: auto; }
                        .overflow-hidden { overflow: hidden; }
                        .whitespace-pre-wrap { white-space: pre-wrap; }
                        .text-indigo-700 { color: #3730a3; }
                        .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
                        .hover\\:shadow-md:hover { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                        .transition-shadow { transition-property: box-shadow; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
                        .duration-200 { transition-duration: 200ms; }
                        .focus-within\\:ring-2:focus-within { --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color); --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color); box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000); }
                        .focus-within\\:ring-indigo-300\\/40:focus-within { --tw-ring-color: rgba(165, 180, 252, 0.4); }
                        .selection\\:bg-indigo-200\\/60 *::selection { background-color: rgba(199, 210, 254, 0.6); }
                        .selection\\:bg-indigo-200\\/60::selection { background-color: rgba(199, 210, 254, 0.6); }
                        .h-\\[28rem\\] { height: 28rem; }
                        .h-\\[36rem\\] { height: 36rem; }

                        /* Medium screens and up */
                        @media (min-width: 768px) {
                            .md\\:text-xl { font-size: 1.25rem; }
                            .md\\:py-8 { padding-top: 2rem; padding-bottom: 2rem; }
                            .md\\:h-\\[36rem\\] { height: 36rem; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🧸 Promptbook Components Playground</h1>
                        <p class="subtitle">
                            Testing ground for <code>@promptbook/components</code> React components
                            <span class="status-badge">Server Running</span>
                            <span class="live-badge">Live Component</span>
                        </p>

                        <div class="component-info">
                            <h2>📝 BookEditor Component</h2>
                            <p>
                                The <code>&lt;BookEditor /&gt;</code> component provides a rich text editor
                                for promptbook files with syntax highlighting of commitment types like
                                <strong>PERSONA</strong>, <strong>KNOWLEDGE</strong>, <strong>STYLE</strong>, etc.
                            </p>
                            <p><strong>🔥 This is the LIVE component loaded directly from:</strong> <code>src/book-components/BookEditor/BookEditor.tsx</code></p>
                        </div>

                        <div class="playground-section">
                            <h2>🎮 Live Component Preview</h2>
                            <p>Here's the actual BookEditor component running live. Changes to the source file will be reflected here:</p>

                            <div class="live-component-container">
                                <div id="book-editor-root">
                                    <div class="loading">Loading BookEditor component...</div>
                                </div>
                            </div>
                        </div>

                        <div class="footer">
                            <p>
                                Promptbook Components Playground Server •
                                <a href="/api/components" target="_blank">View API</a> •
                                <a href="/components/BookEditor/source" target="_blank">Component Source</a> •
                                <a href="/health" target="_blank">Health Check</a> •
                                <a href="https://github.com/webgptorg/promptbook" target="_blank">GitHub</a>
                            </p>
                        </div>
                    </div>

                    <script type="text/babel">
                        const { useState, useEffect, useRef, useCallback, useMemo } = React;

                        // Global component reference that will be set by the dynamically loaded component
                        let DynamicBookEditor = null;

                        // App component
                        function App() {
                            const [bookContent, setBookContent] = useState('');
                            const [error, setError] = useState(null);
                            const [componentSource, setComponentSource] = useState(null);
                            const [componentLoaded, setComponentLoaded] = useState(false);

                            // Load the actual component source and transpiled version
                            useEffect(() => {
                                let isMounted = true;

                                async function loadComponent() {
                                    try {
                                        // Load component metadata
                                        const sourceResponse = await fetch('/components/BookEditor/source');
                                        if (!sourceResponse.ok) {
                                            throw new Error(\`HTTP \${sourceResponse.status}: \${sourceResponse.statusText}\`);
                                        }
                                        const sourceData = await sourceResponse.json();

                                        // Load transpiled component
                                        const transpiledResponse = await fetch('/components/BookEditor/transpiled');
                                        if (!transpiledResponse.ok) {
                                            throw new Error(\`HTTP \${transpiledResponse.status}: \${transpiledResponse.statusText}\`);
                                        }
                                        const transpiledCode = await transpiledResponse.text();

                                        if (isMounted) {
                                            setComponentSource(sourceData);

                                            // Execute the transpiled component code
                                            try {
                                                const script = new Function(transpiledCode + '; return BookEditor;');
                                                DynamicBookEditor = script();
                                                setComponentLoaded(true);
                                                console.log('📝 Loaded and transpiled BookEditor from:', sourceData.path);
                                            } catch (execError) {
                                                console.error('❌ Error executing transpiled component:', execError);
                                                setError(\`Failed to execute component: \${execError.message}\`);
                                            }
                                        }
                                    } catch (err) {
                                        if (isMounted) {
                                            setError(\`Failed to load component: \${err.message}\`);
                                            console.error('❌ Error loading component:', err);
                                        }
                                    }
                                }

                                loadComponent();

                                // Poll for changes every 3 seconds
                                const interval = setInterval(loadComponent, 3000);

                                return () => {
                                    isMounted = false;
                                    clearInterval(interval);
                                };
                            }, []);

                            if (error) {
                                return React.createElement('div', { className: 'error-display' }, error);
                            }

                            if (!componentLoaded || !DynamicBookEditor) {
                                return React.createElement('div', { className: 'loading' },
                                    componentSource ?
                                        \`🔄 Transpiling component from \${componentSource.path}...\` :
                                        '⏳ Loading component source...'
                                );
                            }

                            return React.createElement('div', { className: 'flex flex-col gap-4' },
                                React.createElement('div', { className: 'mb-4' },
                                    React.createElement('p', { className: 'text-sm text-gray-600' },
                                        \`✅ Live component loaded from: \${componentSource.path} (last modified: \${new Date(componentSource.lastModified).toLocaleTimeString()})\`
                                    )
                                ),
                                React.createElement(DynamicBookEditor, {
                                    className: 'max-w-4xl mx-auto',
                                    value: bookContent,
                                    onChange: setBookContent
                                })
                            );
                        }

                        // Render the app
                        const root = ReactDOM.createRoot(document.getElementById('book-editor-root'));
                        root.render(React.createElement(App));
                    </script>
                </body>
                </html>
            `);

            res.set('Content-Type', 'text/html');
            res.send(html);
        } catch (error) {
            console.error('Error rendering playground:', error);
            res.status(500).send(
                spaceTrim(`
                <h1>Error</h1>
                <p>Failed to render the components playground: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }</p>
            `),
            );
        }
    });

    // Component preview endpoints
    app.get('/components/:componentName', (req, res) => {
        const { componentName } = req.params;

        if (componentName === 'BookEditor') {
            const sampleContent = req.query.sample
                ? String(req.query.sample)
                : spaceTrim(`
                # Sample Book

                -   PERSONA A helpful assistant
                -   KNOWLEDGE Basic conversational skills

                ## Greeting

                > Hello! How can I help you today?

                → {response}
            `);

            const html = spaceTrim(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>BookEditor Component Preview</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 20px;
                            font-family: system-ui;
                            background: #f5f5f5;
                        }
                        .container {
                            max-width: 800px;
                            margin: 0 auto;
                            background: white;
                            border-radius: 8px;
                            padding: 20px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        .editor-demo {
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            padding: 20px;
                            background: #f9f9f9;
                            font-family: 'SFMono-Regular', Consolas, monospace;
                            white-space: pre-wrap;
                            min-height: 200px;
                            margin: 20px 0;
                        }
                        .back-link {
                            display: inline-block;
                            margin-bottom: 20px;
                            color: #667eea;
                            text-decoration: none;
                        }
                        .back-link:hover {
                            text-decoration: underline;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <a href="/" class="back-link">← Back to Playground</a>
                        <h1>BookEditor Component Preview</h1>
                        <p>This is a static representation of the BookEditor component with sample content:</p>
                        <div class="editor-demo">${sampleContent}</div>
                        <p><em>Note: The actual component includes syntax highlighting, real-time editing, and interactive features.</em></p>
                    </div>
                </body>
                </html>
            `);

            res.set('Content-Type', 'text/html');
            res.send(html);
        } else {
            res.status(404).json({
                error: 'Component not found',
                available: ['BookEditor'],
                message: 'Try /components/BookEditor',
            });
        }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            server: 'promptbook-components-playground',
            port,
            components: ['BookEditor'],
            endpoints: ['GET /', 'GET /api/components', 'GET /components/BookEditor', 'GET /health'],
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: {
                node: process.version,
                platform: process.platform,
            },
        });
    });

    // Start the server
    server.listen(port, () => {
        console.info(colors.green(`🚀 Components Playground Server running on http://localhost:${port}`));
        console.info(colors.cyan(`📝 BookEditor demo: http://localhost:${port}`));
        console.info(colors.cyan(`🔍 Component preview: http://localhost:${port}/components/BookEditor`));
        console.info(colors.cyan(`🔌 API endpoint: http://localhost:${port}/api/components`));
        console.info(colors.cyan(`💚 Health check: http://localhost:${port}/health`));
        // console.info(colors.yellow(`👀 Press Ctrl+C to stop the server`));
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.info(colors.yellow('\n🛑 Shutting down Components Playground Server...'));
        server.close(() => {
            console.info(colors.green('✅ Server shut down gracefully'));
            process.exit(0);
        });
    });

    process.on('SIGTERM', () => {
        console.info(colors.yellow('\n🛑 Received SIGTERM, shutting down Components Playground Server...'));
        server.close(() => {
            console.info(colors.green('✅ Server shut down gracefully'));
            process.exit(0);
        });
    });

    await forEver();
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
