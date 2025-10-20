'use client';

import { countCharacters } from '../../../../src/utils/expectation-counters/countCharacters';
import { countLines } from '../../../../src/utils/expectation-counters/countLines';
import { countPages } from '../../../../src/utils/expectation-counters/countPages';
import { countParagraphs } from '../../../../src/utils/expectation-counters/countParagraphs';
import { countSentences } from '../../../../src/utils/expectation-counters/countSentences';
import { countWords } from '../../../../src/utils/expectation-counters/countWords';
import { useState } from 'react';

export default function CountingUtilitiesPreview() {
    const [text, setText] = useState('');

    return (
        <div className="p-6 space-y-4">
            <textarea
                className="w-full h-40 p-2 border rounded"
                placeholder="Paste text here to see the counts..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-100 p-4 rounded">
                    <div className="text-lg font-bold">{countCharacters(text)}</div>
                    <div className="text-gray-600">Characters</div>
                </div>
                <div className="bg-gray-100 p-4 rounded">
                    <div className="text-lg font-bold">{countWords(text)}</div>
                    <div className="text-gray-600">Words</div>
                </div>
                <div className="bg-gray-100 p-4 rounded">
                    <div className="text-lg font-bold">{countSentences(text)}</div>
                    <div className="text-gray-600">Sentences</div>
                </div>
                <div className="bg-gray-100 p-4 rounded">
                    <div className="text-lg font-bold">{countParagraphs(text)}</div>
                    <div className="text-gray-600">Paragraphs</div>
                </div>
                <div className="bg-gray-100 p-4 rounded">
                    <div className="text-lg font-bold">{countLines(text)}</div>
                    <div className="text-gray-600">Lines</div>
                </div>
                <div className="bg-gray-100 p-4 rounded">
                    <div className="text-lg font-bold">{countPages(text)}</div>
                    <div className="text-gray-600">Pages</div>
                </div>
            </div>
        </div>
    );
}
