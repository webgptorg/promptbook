'use client';

import { useState } from 'react';
import { Card } from '../../../components/Homepage/Card';
import { SearchResult } from '../../../../../../src/search-engines/SearchResult';
import { search } from './actions';

export function SearchEngineTestClient() {
    const [query, setQuery] = useState('');
    const [provider, setProvider] = useState('dummy');
    const [results, setResults] = useState<SearchResult[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query) return;

        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const results = await search(query, provider);
            setResults(results);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
             <div className="mt-20 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900 font-light">Search Engine Test</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Test the search engine capabilities by providing a query.
                    </p>
                </div>
            </div>

            <Card>
                <div className="mb-4 space-y-4">
                     <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Query</label>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., Cat"
                            className="w-full p-2 border border-gray-300 rounded"
                            disabled={isLoading}
                             onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch();
                                }
                            }}
                        />
                    </div>
                     <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                            disabled={isLoading}
                        >
                            <option value="dummy">Dummy</option>
                        </select>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading || !query}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                        >
                            {isLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>

                {error && (
                     <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {results && (
                     <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Results</h2>
                        {results.map((result, index) => (
                            <div key={index} className="border p-4 rounded bg-gray-50">
                                <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">
                                    {result.title}
                                </a>
                                <div className="text-sm text-green-700">{result.url}</div>
                                <p className="text-gray-700">{result.snippet}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
