'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    DEFAULT_LINGUISTIC_HASH_WORD_COUNT,
    MAX_LINGUISTIC_HASH_WORD_COUNT,
    MIN_LINGUISTIC_HASH_WORD_COUNT,
    linguisticHash,
    normalizeLinguisticHashWordCount,
} from '../../../../../src/utils/misc/linguisticHash';

const defaultInput = 'Promptbook is awesome!';

/**
 * Renders the interactive linguistic hash demo.
 */
export function LinguisticHashComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialInput = searchParams.get('input') || defaultInput;
    const initialWordCountParam = searchParams.get('words');
    const initialWordCount = normalizeLinguisticHashWordCount(
        initialWordCountParam ? Number.parseInt(initialWordCountParam, 10) : undefined,
    );
    const [input, setInput] = useState(initialInput);
    const [hash, setHash] = useState<string>('');
    const [wordCount, setWordCount] = useState<number>(initialWordCount);

    useEffect(() => {
        const updateHash = async () => {
            const newHash = await linguisticHash(input, wordCount);
            setHash(newHash);
        };
        updateHash();

        // Update query parameter
        const params = new URLSearchParams(searchParams.toString());
        if (input === defaultInput) {
            params.delete('input');
        } else {
            params.set('input', input);
        }

        if (wordCount === DEFAULT_LINGUISTIC_HASH_WORD_COUNT) {
            params.delete('words');
        } else {
            params.set('words', wordCount.toString());
        }

        // Use replace to avoid filling history with every keystroke
        const queryString = params.toString();
        router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
    }, [input, wordCount, searchParams, router, pathname]);

    const handleWordCountChange = (value: string) => {
        const parsedValue = Number.parseInt(value, 10);
        if (Number.isNaN(parsedValue)) {
            return;
        }
        setWordCount(normalizeLinguisticHashWordCount(parsedValue));
    };

    const showLowUniquenessWarning = wordCount <= 2;

    return (
        <div className="h-full flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <label htmlFor="input-string" className="text-sm font-medium text-gray-700">
                    Input String
                </label>
                <input
                    id="input-string"
                    type="text"
                    className="w-full p-4 text-xl border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter string to hash..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="word-count" className="text-sm font-medium text-gray-700">
                    Word Count
                </label>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <input
                        id="word-count"
                        type="range"
                        min={MIN_LINGUISTIC_HASH_WORD_COUNT}
                        max={MAX_LINGUISTIC_HASH_WORD_COUNT}
                        step={1}
                        value={wordCount}
                        onChange={(e) => handleWordCountChange(e.target.value)}
                        className="w-full accent-blue-600"
                    />
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={MIN_LINGUISTIC_HASH_WORD_COUNT}
                            max={MAX_LINGUISTIC_HASH_WORD_COUNT}
                            step={1}
                            value={wordCount}
                            onChange={(e) => handleWordCountChange(e.target.value)}
                            className="w-24 p-2 text-base border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                        <span className="text-sm text-gray-500">words</span>
                    </div>
                </div>
                <p className="text-xs text-gray-500">
                    Default is {DEFAULT_LINGUISTIC_HASH_WORD_COUNT}. Range is {MIN_LINGUISTIC_HASH_WORD_COUNT} to{' '}
                    {MAX_LINGUISTIC_HASH_WORD_COUNT}. Increasing the count appends more detail without changing earlier
                    words.
                </p>
                {showLowUniquenessWarning ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        1 to 2 word hashes are short and easy to collide, so expect lower uniqueness.
                    </div>
                ) : null}
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                    Linguistic Hash ({wordCount} words)
                </label>
                <div className="w-full p-8 text-3xl md:text-5xl font-bold text-center bg-white border-2 border-dashed border-blue-200 rounded-xl text-blue-600 shadow-inner min-h-[120px] flex items-center justify-center">
                    {hash}
                </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">What is a Linguistic Hash?</h3>
                <p className="text-blue-800">
                    A linguistic hash is a human-readable representation of data. Instead of a random string of characters like{' '}
                    <code className="bg-blue-100 px-1 rounded text-sm">7a9f...</code>, it uses a deterministic,
                    story-like phrase built from <strong>adjectives</strong>, <strong>nouns</strong>, and{' '}
                    <strong>verbs</strong>.
                </p>
                <ul className="list-disc list-inside mt-2 text-blue-800 space-y-1">
                    <li>
                        <strong>Deterministic:</strong> The same input and word count always produce the same hash.
                    </li>
                    <li>
                        <strong>Avalanche on input:</strong> Tiny input changes cause completely different word sequences.
                    </li>
                    <li>
                        <strong>Stable length:</strong> Increasing the word count only appends more words, keeping the
                        earlier ones intact (e.g. "Slick sigh beating" to "Slick sigh beating dancing").
                    </li>
                    <li>
                        <strong>Word structure:</strong> One word uses a single noun, two words use adjective + noun.
                    </li>
                    <li>
                        <strong>Uniqueness:</strong> Longer hashes are more unique; 1 to 2 words can collide easily.
                    </li>
                </ul>
            </div>
        </div>
    );
}
