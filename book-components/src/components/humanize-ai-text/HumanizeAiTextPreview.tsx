'use client';

import { spaceTrim } from '@promptbook-local/utils';
import { useEffect, useState } from 'react';
import { humanizeAiText } from '../../../../src/utils/markdown/humanizeAiText';

/* eslint-disable no-irregular-whitespace */

const defaultText = spaceTrim(`
    „The City Between Stones and Stars“

    „Prague never lets you go… this dear little mother has claws.“
    — Franz Kafka

    Beneath her bridges, the Vltava hums,
    a silver thread through labyrinthine dreams.
    Cobblestones remember footsteps
    of alchemists, lovers, and kings.
`);

export default function HumanizeAiTextPreview() {
    const [inputText, setInputText] = useState(defaultText);
    const [outputText, setOutputText] = useState(humanizeAiText(defaultText));
    const [isHumanizing, setIsHumanizing] = useState(false);

    useEffect(() => {
        setIsHumanizing(true);
        const handler = setTimeout(() => {
            const humanizedText = humanizeAiText(inputText);
            setOutputText(humanizedText);
            setIsHumanizing(false);
        }, 100);

        return () => {
            clearTimeout(handler);
        };
    }, [inputText]);

    return (
        <div className="p-6 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
                <textarea
                    className="w-full md:flex-1 h-64 p-2 border rounded"
                    placeholder="Paste AI-generated text here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <textarea
                    className="w-full md:flex-1 h-64 p-2 border rounded bg-gray-100"
                    placeholder="Humanized text will appear here..."
                    value={outputText}
                    readOnly
                />
            </div>
            <div className="flex justify-center">
                <button className="px-4 py-2 bg-yellow-500 text-white rounded cursor-not-allowed" disabled>
                    {isHumanizing ? 'Humanizing...' : 'Humanized'}
                </button>
            </div>
        </div>
    );
}
