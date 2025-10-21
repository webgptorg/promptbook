'use client';

import { CountUtils } from '../../../../../src/utils/expectation-counters';
import { useState } from 'react';
import { Code } from '../../../components/Code/Code';
import { UtilityPageLayout } from '../../../components/UtilityPageLayout/UtilityPageLayout';
import { MainContent } from '../../../components/MainContent/MainContent';
import { Sidebar } from '../../../components/Sidebar/Sidebar';

function Counter({
    name,
    unit,
    count,
    code,
}: {
    name: string;
    unit: string;
    count: number;
    code: string;
}) {
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {name}: {count} {unit}
            </h3>
            <Code content={code} />
        </div>
    );
}

export default function CountingUtilitiesPage() {
    const [text, setText] = useState('');

    const counters = [
        {
            name: 'Characters',
            unit: 'characters',
            fn: CountUtils.CHARACTERS,
            code: `import { countCharacters } from '@promptbook/utils';\n\ncountCharacters('Hello World');`,
        },
        {
            name: 'Words',
            unit: 'words',
            fn: CountUtils.WORDS,
            code: `import { countWords } from '@promptbook/utils';\n\ncountWords('Hello World');`,
        },
        {
            name: 'Sentences',
            unit: 'sentences',
            fn: CountUtils.SENTENCES,
            code: `import { countSentences } from '@promptbook/utils';\n\ncountSentences('Hello World. How are you?');`,
        },
        {
            name: 'Paragraphs',
            unit: 'paragraphs',
            fn: CountUtils.PARAGRAPHS,
            code: `import { countParagraphs } from '@promptbook/utils';\n\ncountParagraphs('Hello World.\\n\\nHow are you?');`,
        },
        {
            name: 'Lines',
            unit: 'lines',
            fn: CountUtils.LINES,
            code: `import { countLines } from '@promptbook/utils';\n\ncountLines('Hello World.\\nHow are you?');`,
        },
        {
            name: 'Pages',
            unit: 'pages',
            fn: CountUtils.PAGES,
            code: `import { countPages } from '@promptbook/utils';\n\ncountPages('...');`,
        },
    ];

    return (
        <UtilityPageLayout
            title="Counting Utilities"
            description="A collection of utilities for counting words, characters, and sentences in a text."
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MainContent>
                    <div className="space-y-6">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Paste or write text here..."
                            rows={10}
                            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {counters.map(({ name, unit, fn, code }) => (
                                <Counter key={name} name={name} unit={unit} count={fn(text)} code={code} />
                            ))}
                        </div>
                    </div>
                </MainContent>
                <Sidebar>
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                                    Download Utility
                                </button>
                                <button className="w-full bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                                    Copy Import
                                </button>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Details</h3>
                            <div className="space-y-2 text-sm">
                                <p>
                                    <span className="font-semibold">Category:</span> Text Analysis
                                </p>
                                <p>
                                    <span className="font-semibold">Dependencies:</span> react: ^18.0.0 | ^19.0.0
                                </p>
                                <p>
                                    <span className="font-semibold">@promptbook/utils:</span> 0.103.0-4
                                </p>
                            </div>
                        </div>
                    </div>
                </Sidebar>
            </div>
        </UtilityPageLayout>
    );
}
