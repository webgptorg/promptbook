'use client';

import { CountUtils } from '@promptbook-local/utils';
import { useState } from 'react';

export default function CountingUtilitiesPreview() {
    const [text, setText] = useState('');

    const counters = [
        { name: 'Characters', unit: 'characters', fn: CountUtils.CHARACTERS },
        { name: 'Words', unit: 'words', fn: CountUtils.WORDS },
        { name: 'Sentences', unit: 'sentences', fn: CountUtils.SENTENCES },
        { name: 'Paragraphs', unit: 'paragraphs', fn: CountUtils.PARAGRAPHS },
        { name: 'Lines', unit: 'lines', fn: CountUtils.LINES },
        { name: 'Pages', unit: 'pages', fn: CountUtils.PAGES },
    ];

    return (
        <div className="p-6 space-y-4">
            <textarea
                className="w-full h-40 p-2 border rounded"
                placeholder="Paste text here to see the counts..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {counters.map(({ name, fn }) => (
                    <div key={name} className="bg-gray-100 p-4 rounded">
                        <div className="text-lg font-bold">{fn(text)}</div>
                        <div className="text-gray-600">{name}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
