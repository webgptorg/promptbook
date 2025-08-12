import { BookEditor } from '@promptbook/components';
import { useState } from 'react';

const EXAMPLE_BOOKS = {
    simple: `# ✨ Simple Example

- BOOK VERSION 1.0.0
- INPUT PARAMETER {topic}
- OUTPUT PARAMETER {content}

## Write Content

- PERSONA Expert writer
- EXPECT MIN 1 sentence
- EXPECT MAX 3 paragraphs

> Write informative content about {topic}

→ {content}`,

    advanced: `# 🚀 Advanced Marketing Campaign

- BOOK VERSION 1.0.0
- URL https://promptbook.studio/marketing.book
- INPUT PARAMETER {product}
- INPUT PARAMETER {target_audience}
- OUTPUT PARAMETER {campaign_strategy}
- OUTPUT PARAMETER {social_posts}

## Campaign Strategy

- PERSONA Senior marketing strategist with 10+ years experience
- KNOWLEDGE ./marketing-best-practices.pdf
- KNOWLEDGE https://marketingtrends.com/
- EXPECT MIN 5 paragraphs
- EXPECT MAX 2 pages
- FORMAT markdown

> Create a comprehensive marketing campaign strategy for {product} targeting {target_audience}

→ {campaign_strategy}

## Social Media Posts

- PERSONA Creative social media manager
- EXPECT exactly 5 posts
- FORMAT JSON

> Based on the campaign strategy, create 5 engaging social media posts:

{campaign_strategy}

→ {social_posts}`,

    knowledge: `# 📚 Knowledge-Based Assistant

- BOOK VERSION 1.0.0
- INPUT PARAMETER {question}
- OUTPUT PARAMETER {answer}

## Answer Question

- PERSONA Knowledgeable assistant
- KNOWLEDGE https://wikipedia.org/
- KNOWLEDGE ./company-docs/
- RULE Always cite sources
- RULE Be factual and accurate
- EXPECT MIN 2 sentences
- EXPECT MAX 1 paragraph

> Answer this question using the provided knowledge: {question}

→ {answer}`,
};

export function BookEditorShowcase() {
    const [currentExample, setCurrentExample] = useState<keyof typeof EXAMPLE_BOOKS>('simple');
    const [editorValue, setEditorValue] = useState(EXAMPLE_BOOKS.simple);
    const [isControlled, setIsControlled] = useState(true);

    const handleExampleChange = (example: keyof typeof EXAMPLE_BOOKS) => {
        setCurrentExample(example);
        setEditorValue(EXAMPLE_BOOKS[example]);
    };

    return (
        <div className="space-y-8">
            {/* Component Title */}
            <div className="component-showcase p-6">
                <div className="section-header p-4 -m-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">📝 BookEditor Component</h2>
                    <p className="text-gray-600 mt-1">
                        A rich text editor for Promptbook files with syntax highlighting
                    </p>
                </div>

                {/* Controls */}
                <div className="mb-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Example Templates</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(EXAMPLE_BOOKS).map((example) => (
                                <button
                                    key={example}
                                    onClick={() => handleExampleChange(example as keyof typeof EXAMPLE_BOOKS)}
                                    className={`px-4 py-2 rounded-md font-medium transition-all ${
                                        currentExample === example
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {example.charAt(0).toUpperCase() + example.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={isControlled}
                                onChange={(e) => setIsControlled(e.target.checked)}
                                className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Controlled Mode</span>
                        </label>
                        {isControlled && (
                            <div className="text-sm text-gray-500">Character count: {editorValue.length}</div>
                        )}
                    </div>
                </div>

                {/* BookEditor Component */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <BookEditor
                        className="max-w-4xl mx-auto"
                        value={isControlled ? editorValue : undefined}
                        onChange={isControlled ? setEditorValue : undefined}
                    />
                </div>

                {/* Component Info */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Component Features</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                        <li>✅ Syntax highlighting for Promptbook commitment types</li>
                        <li>✅ Lined paper background with visual guides</li>
                        <li>✅ Responsive design (desktop and mobile)</li>
                        <li>✅ Controlled and uncontrolled modes</li>
                        <li>✅ Custom styling support via className and fontClassName</li>
                        <li>✅ Real-time validation</li>
                    </ul>
                </div>
            </div>

            {/* Styling Variations */}
            <div className="component-showcase p-6">
                <div className="section-header p-4 -m-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">🎨 Styling Variations</h2>
                    <p className="text-gray-600 mt-1">Different styling options and configurations</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Compact Version */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Compact Version</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <BookEditor
                                className="h-64"
                                value={`# Quick Note

- INPUT PARAMETER {idea}
- OUTPUT PARAMETER {note}

> Expand on: {idea}

→ {note}`}
                            />
                        </div>
                    </div>

                    {/* Custom Styled Version */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Custom Styling</h3>
                        <div className="border rounded-lg overflow-hidden bg-slate-900">
                            <BookEditor
                                className="dark-theme"
                                value={`# 🌙 Dark Theme Example

- PERSONA Night owl developer
- STYLE Dark and minimal
- OUTPUT PARAMETER {code}

> Write elegant code

→ {code}`}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* API Usage Examples */}
            <div className="component-showcase p-6">
                <div className="section-header p-4 -m-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">💻 API Usage Examples</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Basic Usage</h3>
                        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                            <code>{`import { BookEditor } from '@promptbook/components';

function MyApp() {
  return (
    <BookEditor
      className="max-w-4xl mx-auto"
    />
  );
}`}</code>
                        </pre>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-3">Controlled Component</h3>
                        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                            <code>{`const [book, setBook] = useState('');

return (
  <BookEditor
    value={book}
    onChange={setBook}
    className="w-full"
  />
);`}</code>
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
