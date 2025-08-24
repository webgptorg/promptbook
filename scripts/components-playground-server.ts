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
                        display: flex;
                        gap: 20px;
                        min-height: 500px;
                    }

                    .code-panel, .preview-panel {
                        flex: 1;
                        border: 1px solid;
                        border-radius: 8px;
                        padding: 20px;
                    }

                    .light .code-panel, .light .preview-panel {
                        border-color: #e0e0e0;
                        background: #fafafa;
                    }

                    .dark .code-panel, .dark .preview-panel {
                        border-color: #444;
                        background: #2a2a2a;
                    }

                    .code-panel h3, .preview-panel h3 {
                        margin: 0 0 15px 0;
                        font-size: 16px;
                        font-weight: 600;
                    }

                    .loading {
                        text-align: center;
                        padding: 40px;
                        opacity: 0.7;
                    }

                    @media (max-width: 768px) {
                        .component-container {
                            flex-direction: column;
                        }
                    }
                </style>
            </head>
            <body class="light">
                <div id="root"></div>

                <script type="text/babel">
                    const { useState, useEffect, useCallback, useMemo, useRef } = React;

                    // Mock dependencies for BookEditor
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

                    // Simplified BookEditor component for browser preview (DRY principle)
                    function SimplifiedBookEditor({ className = '', value, onChange, theme }) {
                        const [internalValue, setInternalValue] = useState(DEFAULT_BOOK);
                        const textareaRef = useRef(null);
                        const highlightRef = useRef(null);

                        const currentValue = value !== undefined ? value : internalValue;

                        const handleChange = useCallback((event) => {
                            const newValue = event.target.value;
                            if (value !== undefined) {
                                onChange?.(newValue);
                            } else {
                                setInternalValue(newValue);
                            }
                        }, [value, onChange]);

                        const handleScroll = useCallback((event) => {
                            const t = event.currentTarget;
                            if (highlightRef.current) {
                                highlightRef.current.scrollTop = t.scrollTop;
                                highlightRef.current.scrollLeft = t.scrollLeft;
                            }
                        }, []);

                        // Build highlighted HTML
                        const highlightedHtml = useMemo(() => {
                            const text = currentValue || '';
                            const commitmentTypes = getAllCommitmentDefinitions().map(def => def.type);
                            const pattern = '\\\\b(?:' + commitmentTypes.join('|') + ')\\\\b';
                            const regex = new RegExp(pattern, 'gmi');

                            let result = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                            result = result.replace(regex, '<span style="color: #4f46e5; font-weight: 600;">$&</span>');
                            return result;
                        }, [currentValue]);

                        const editorStyle = {
                            position: 'relative',
                            fontFamily: 'ui-serif, Georgia, serif',
                            fontSize: '16px',
                            lineHeight: '1.6',
                            border: '1px solid ' + (theme === 'light' ? '#d1d5db' : '#4b5563'),
                            borderRadius: '8px',
                            background: theme === 'light' ? 'white' : '#1f2937',
                            overflow: 'hidden'
                        };

                        const textareaStyle = {
                            width: '100%',
                            height: '300px',
                            padding: '16px',
                            border: 'none',
                            outline: 'none',
                            resize: 'none',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                            background: 'transparent',
                            color: 'transparent',
                            caretColor: theme === 'light' ? '#374151' : '#f3f4f6',
                            zIndex: 2,
                            position: 'relative'
                        };

                        const highlightStyle = {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '300px',
                            padding: '16px',
                            margin: 0,
                            border: 'none',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                            color: theme === 'light' ? '#374151' : '#f3f4f6',
                            background: 'transparent',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            pointerEvents: 'none',
                            zIndex: 1
                        };

                        return (
                            <div className={className} style={editorStyle}>
                                <pre
                                    ref={highlightRef}
                                    style={highlightStyle}
                                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                                />
                                <textarea
                                    ref={textareaRef}
                                    style={textareaStyle}
                                    value={currentValue}
                                    onChange={handleChange}
                                    onScroll={handleScroll}
                                    placeholder="Enter your promptbook content here..."
                                    spellCheck={false}
                                />
                            </div>
                        );
                    }

                    function ComponentPreview({ componentName, source, theme }) {
                        const [bookContent, setBookContent] = useState(DEFAULT_BOOK);

                        if (componentName === 'BookEditor') {
                            return (
                                <div style={{
                                    border: '1px solid ' + (theme === 'light' ? '#ddd' : '#555'),
                                    borderRadius: '8px',
                                    padding: '15px',
                                    background: theme === 'light' ? '#fff' : '#222',
                                    maxHeight: '450px',
                                    overflow: 'auto'
                                }}>
                                    <SimplifiedBookEditor
                                        value={bookContent}
                                        onChange={setBookContent}
                                        theme={theme}
                                    />
                                </div>
                            );
                        }

                        return (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                opacity: 0.7
                            }}>
                                Component preview not available
                            </div>
                        );
                    }

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
                                        <>
                                            <div className="code-panel">
                                                <h3>📄 Source Code</h3>
                                                <pre style={{
                                                    maxHeight: '450px',
                                                    overflow: 'auto',
                                                    background: theme === 'light' ? '#f5f5f5' : '#333',
                                                    padding: '15px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    lineHeight: '1.4',
                                                    margin: 0
                                                }}>
                                                    {componentSource.source}
                                                </pre>
                                            </div>
                                            <div className="preview-panel">
                                                <h3>🎮 Live Preview</h3>
                                                <ComponentPreview
                                                    componentName={selectedComponent}
                                                    source={componentSource.source}
                                                    theme={theme}
                                                />
                                            </div>
                                        </>
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
