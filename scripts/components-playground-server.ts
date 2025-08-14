#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import express from 'express';
import { createServer } from 'http';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { forEver } from 'waitasecond';
import { assertsError } from '../src/errors/assertsError';

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
            // Create the full HTML page with inline React demo
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

                        .demo-editor {
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            padding: 20px;
                            background: #f9f9f9;
                            margin: 20px 0;
                            min-height: 200px;
                            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                        }

                        .api-info {
                            background: #e3f2fd;
                            padding: 15px;
                            border-radius: 8px;
                            margin-top: 20px;
                            border-left: 4px solid #2196f3;
                        }

                        .footer {
                            text-align: center;
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 1px solid #dee2e6;
                            color: #6c757d;
                        }

                        .status-badge {
                            background: #28a745;
                            color: white;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: bold;
                        }

                        .code-preview {
                            background: #2d3748;
                            color: #e2e8f0;
                            padding: 20px;
                            border-radius: 8px;
                            overflow-x: auto;
                            margin: 20px 0;
                        }

                        .code-preview pre {
                            margin: 0;
                            white-space: pre-wrap;
                        }

                        .warning-banner {
                            background: #fff3cd;
                            border: 1px solid #ffeaa7;
                            border-radius: 8px;
                            padding: 15px;
                            margin: 20px 0;
                            color: #856404;
                        }

                        .feature-list {
                            list-style: none;
                            padding-left: 0;
                        }

                        .feature-list li {
                            margin: 8px 0;
                            padding-left: 20px;
                            position: relative;
                        }

                        .feature-list li:before {
                            content: '✓';
                            position: absolute;
                            left: 0;
                            color: #28a745;
                            font-weight: bold;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🧸 Promptbook Components Playground</h1>
                        <p class="subtitle">
                            Testing ground for <code>@promptbook/components</code> React components
                            <span class="status-badge">Server Running</span>
                        </p>

                        <div class="component-info">
                            <h2>📝 BookEditor Component</h2>
                            <p>
                                The <code>&lt;BookEditor /&gt;</code> component provides a rich text editor
                                for promptbook files with syntax highlighting of commitment types like
                                <strong>PERSONA</strong>, <strong>KNOWLEDGE</strong>, <strong>STYLE</strong>, etc.
                            </p>
                            <ul class="feature-list">
                                <li><strong>Location:</strong> <code>src/book-components/BookEditor/BookEditor.tsx</code></li>
                                <li><strong>Package:</strong> <code>@promptbook/components</code></li>
                                <li><strong>Framework:</strong> React 18+</li>
                                <li><strong>TypeScript:</strong> Full type support</li>
                                <li><strong>Styling:</strong> Tailwind-compatible classes</li>
                            </ul>
                        </div>

                        <div class="warning-banner">
                            <strong>⚠️ Note:</strong> This is a server-side rendering demo. The actual BookEditor component
                            requires a browser environment with React. For real usage, install
                            <code>@promptbook/components</code> in your React application.
                        </div>

                        <div class="playground-section">
                            <h2>🎮 Component Preview</h2>
                            <p>Here's what the BookEditor component looks like when rendered:</p>

                            <div class="demo-editor">
                                # 🌟 Sample Book

                                -   BOOK VERSION 1.0.0
                                -   INPUT PARAMETER {topic}
                                -   OUTPUT PARAMETER {article}

                                ## Write an Article

                                -   PERSONA Jane, marketing specialist with prior experience in tech and AI writing
                                -   KNOWLEDGE https://wikipedia.org/
                                -   EXPECT MIN 1 Sentence
                                -   EXPECT MAX 5 Pages

                                > Write an article about {topic}

                                → {article}
                            </div>
                            <p><em>📝 This is a static representation. The actual component includes syntax highlighting,
                            real-time editing, and line numbering.</em></p>
                        </div>

                        <div class="playground-section">
                            <h2>💻 Usage Example</h2>
                            <div class="code-preview">
<pre>
import { BookEditor } from '@promptbook/components';
import { validateBook } from '@promptbook/core';

export default function MyApp() {
  const [bookContent, setBookContent] = useState(validateBook(\`
    # My First Book

    -   PERSONA A helpful assistant
    -   KNOWLEDGE Basic conversational skills

    ## Greeting

    > Hello! How can I help you today?

    → {response}
  \`));

  return (
    &lt;div className="p-6"&gt;
      &lt;BookEditor
        className="max-w-3xl mx-auto"
        value={bookContent}
        onChange={setBookContent}
      /&gt;
    &lt;/div&gt;
  );
}
</pre>
                            </div>
                        </div>

                        <div class="playground-section">
                            <h2>🔧 Props Interface</h2>
                            <div class="code-preview">
<pre>
interface BookEditorProps {
  // Additional CSS classes for wrapper
  className?: string;

  // Optional font className (e.g. from next/font)
  fontClassName?: string;

  // Controlled value of the book text
  value?: string_book;

  // Controlled change handler
  onChange?: (value: string_book) => void;
}
</pre>
                            </div>
                        </div>

                        <div class="api-info">
                            <h3>🔌 API Endpoints</h3>
                            <ul>
                                <li><strong>GET /api/components</strong> - Get component information and examples</li>
                                <li><strong>GET /health</strong> - Health check endpoint</li>
                                <li><strong>GET /components/BookEditor</strong> - BookEditor specific preview</li>
                            </ul>
                            <p>This playground server is running on <strong>localhost:4461</strong></p>
                        </div>

                        <div class="footer">
                            <p>
                                Promptbook Components Playground Server •
                                <a href="/api/components" target="_blank">View API</a> •
                                <a href="/health" target="_blank">Health Check</a> •
                                <a href="https://github.com/webgptorg/promptbook" target="_blank">GitHub</a>
                            </p>
                        </div>
                    </div>

                    <script>
                        // Add some basic interactivity
                        console.log('🧸 Promptbook Components Playground loaded');
                        console.log('Components available:', ['BookEditor']);
                        console.log('Server running on localhost:4461');

                        // Simple demo functionality
                        document.addEventListener('DOMContentLoaded', function() {
                            console.log('✅ Playground initialized');
                        });
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
