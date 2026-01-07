'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { linguisticHash } from '../../../../../src/utils/misc/linguisticHash';

const defaultInput = 'Promptbook is awesome!';

export function LinguisticHashComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialInput = searchParams.get('input') || defaultInput;
    const [input, setInput] = useState(initialInput);
    const [hash, setHash] = useState<string>('');

    useEffect(() => {
        const updateHash = async () => {
            const newHash = await linguisticHash(input);
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
        
        // Use replace to avoid filling history with every keystroke
        const queryString = params.toString();
        router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });

    }, [input, searchParams, router, pathname]);

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
                <label className="text-sm font-medium text-gray-700">
                    Linguistic Hash
                </label>
                <div className="w-full p-8 text-3xl md:text-5xl font-bold text-center bg-white border-2 border-dashed border-blue-200 rounded-xl text-blue-600 shadow-inner min-h-[120px] flex items-center justify-center">
                    {hash}
                </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">What is a Linguistic Hash?</h3>
                <p className="text-blue-800">
                    A linguistic hash is a human-readable representation of data. Instead of a random string of characters like <code className="bg-blue-100 px-1 rounded text-sm">7a9f...</code>, it uses a deterministic combination of an <strong>adjective</strong>, a <strong>noun</strong>, and a <strong>verb</strong>. 
                </p>
                <ul className="list-disc list-inside mt-2 text-blue-800 space-y-1">
                    <li><strong>Deterministic:</strong> The same input always produces the same hash.</li>
                    <li><strong>Human-readable:</strong> Easy to remember and communicate.</li>
                    <li><strong>Unique:</strong> High probability of being different for different inputs.</li>
                </ul>
            </div>
        </div>
    );
}
