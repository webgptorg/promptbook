'use client';

import { humanizeAiText } from '../../../../src/utils/markdown/humanizeAiText';
import { useState } from 'react';

export default function HumanizeAiTextPreview() {
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');

    const handleHumanize = () => {
        const humanizedText = humanizeAiText(inputText);
        setOutputText(humanizedText);
    };

    return (
        <div className="p-6 space-y-4">
            <textarea
                className="w-full h-40 p-2 border rounded"
                placeholder="Paste AI-generated text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
            />
            <button
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                onClick={handleHumanize}
            >
                Humanize
            </button>
            <textarea
                className="w-full h-40 p-2 border rounded bg-gray-100"
                placeholder="Humanized text will appear here..."
                value={outputText}
                readOnly
            />
        </div>
    );
}
