#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import express from 'express';
import { readFile } from 'fs';
import { createServer } from 'http';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { promisify } from 'util';
import { forEver } from 'waitasecond';
import { assertsError } from '../src/errors/assertsError';

const readFileAsync = promisify(readFile);

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

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Get component source
    app.get('/components/BookEditor/source', async (req, res) => {
        try {
            const componentPath = join(__dirname, '..', 'src', 'book-components', 'BookEditor', 'BookEditor.tsx');
            const componentSource = await readFileAsync(componentPath, 'utf-8');
            res.json({ name: 'BookEditor', source: componentSource });
        } catch (error) {
            res.status(500).json({ error: 'Failed to read component' });
        }
    });

    // Main playground page
    app.get('/', (req, res) => {
        const html = spaceTrim(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Components Playground</title>
                <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                <style>
                    body {
                        font-family: system-ui, sans-serif;
                        margin: 0;
                        padding: 20px;
                        transition: background-color 0.3s, color 0.3s;
                    }

                    .light {
                        background: #ffffff;
                        color: #333333;
                    }

                    .dark {
                        background: #1a1a1a;
                        color: #ffffff;
                    }

                    .controls {
                        display: flex;
                        gap: 20px;
                        align-items: center;
                        margin-bottom: 30px;
                        padding: 15px;
                        border: 1px solid;
                        border-radius: 8px;
                    }

                    .light .controls {
                        border-color: #e0e0e0;
                        background: #f9f9f9;
                    }

                    .dark .controls {
                        border-color: #444;
                        background: #2a2a2a;
                    }

                    select, button {
                        padding: 8px 12px;
                        border: 1px solid;
                        border-radius: 4px;
                        background: inherit;
                        color: inherit;
                        cursor: pointer;
                    }

                    .light select, .light button {
                        border-color: #ccc;
                    }

                    .dark select, .dark button {
                        border-color: #666;
                    }

                    .component-container {
                        border: 1px solid;
                        border-radius: 8px;
                        padding: 20px;
                        min-height: 400px;
                    }

                    .light .component-container {
                        border-color: #e0e0e0;
                        background: #fafafa;
                    }

                    .dark .component-container {
                        border-color: #444;
                        background: #2a2a2a;
                    }

                    .loading {
                        text-align: center;
                        padding: 40px;
                        opacity: 0.7;
                    }
                </style>
            </head>
            <body class="light">
                <div id="root"></div>

                <script type="text/babel">
                    const { useState, useEffect } = React;

                    function App() {
                        const [theme, setTheme] = useState('light');
                        const [selectedComponent, setSelectedComponent] = useState('BookEditor');
                        const [componentSource, setComponentSource] = useState(null);
                        const [loading, setLoading] = useState(true);

                        // Available components
                        const components = [
                            { name: 'BookEditor', path: '/components/BookEditor/source' }
                        ];

                        // Load component source
                        useEffect(() => {
                            async function loadComponent() {
                                setLoading(true);
                                try {
                                    const response = await fetch(\`/components/\${selectedComponent}/source\`);
                                    const data = await response.json();
                                    setComponentSource(data);
                                } catch (error) {
                                    console.error('Failed to load component:', error);
                                }
                                setLoading(false);
                            }
                            loadComponent();
                        }, [selectedComponent]);

                        // Update body theme class
                        useEffect(() => {
                            document.body.className = theme;
                        }, [theme]);

                        return (
                            <div>
                                <h1>🧸 Components Playground</h1>

                                <div className="controls">
                                    <div>
                                        <label>Component: </label>
                                        <select
                                            value={selectedComponent}
                                            onChange={(e) => setSelectedComponent(e.target.value)}
                                        >
                                            {components.map(comp => (
                                                <option key={comp.name} value={comp.name}>
                                                    {comp.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Theme: </label>
                                        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                                            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                                        </button>
                                    </div>
                                </div>

                                <div className="component-container">
                                    {loading ? (
                                        <div className="loading">Loading component...</div>
                                    ) : componentSource ? (
                                        <div>
                                            <h2>{componentSource.name}</h2>
                                            <pre style={{
                                                maxHeight: '400px',
                                                overflow: 'auto',
                                                background: theme === 'light' ? '#f5f5f5' : '#333',
                                                padding: '15px',
                                                borderRadius: '4px',
                                                fontSize: '14px',
                                                lineHeight: '1.4'
                                            }}>
                                                {componentSource.source}
                                            </pre>
                                        </div>
                                    ) : (
                                        <div>Failed to load component</div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    const root = ReactDOM.createRoot(document.getElementById('root'));
                    root.render(<App />);
                </script>
            </body>
            </html>
        `);

        res.set('Content-Type', 'text/html');
        res.send(html);
    });

    // Start server
    server.listen(port, () => {
        console.info(colors.green(`🚀 Components Playground running on http://localhost:${port}`));
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.info(colors.yellow('\n🛑 Shutting down...'));
        server.close(() => {
            console.info(colors.green('✅ Server shut down'));
            process.exit(0);
        });
    });

    await forEver();
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
