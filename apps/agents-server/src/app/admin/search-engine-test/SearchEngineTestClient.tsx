'use client';

import { useState } from 'react';
import { SearchResult } from '../../../../../../src/search-engines/SearchResult';
import { Card } from '../../../components/Homepage/Card';
import { search } from './actions';

export function SearchEngineTestClient() {
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');
    const [gl, setGl] = useState('');
    const [hl, setHl] = useState('');
    const [num, setNum] = useState('10');
    const [engine, setEngine] = useState('google');
    const [googleDomain, setGoogleDomain] = useState('google.com');

    const [provider, setProvider] = useState('dummy');
    const [results, setResults] = useState<SearchResult[] | null>(null);
    const [rawResponse, setRawResponse] = useState<Record<string, unknown> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query) return;

        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const options: Record<string, unknown> = {};
            if (location) options.location = location;
            if (gl) options.gl = gl;
            if (hl) options.hl = hl;
            if (num) options.num = parseInt(num, 10);
            if (engine) options.engine = engine;
            if (googleDomain) options.google_domain = googleDomain;

            const results = await search(query, provider, options);
            setResults(results);
            setRawResponse({ query, provider, options, resultsCount: results.length });
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
                        <br />
                        Note: [🔰] USE SEARCH is working only in demo mode only. Need to implement full functionality
                        via MCP server and Search engines
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
                            <option value="serp">Serp</option>
                            <option value="bing">Bing</option>
                            <option value="google">Google Custom Search</option>
                            {/* <- TODO: [🚃] List Search engines this dynamically from proper register */}
                        </select>
                    </div>

                    {provider === 'serp' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Location</label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g., Austin, Texas, United States"
                                    className="w-full p-2 border border-gray-300 rounded"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Country Code (gl)</label>
                                <input
                                    type="text"
                                    value={gl}
                                    onChange={(e) => setGl(e.target.value)}
                                    placeholder="e.g., us"
                                    className="w-full p-2 border border-gray-300 rounded"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Language Code (hl)</label>
                                <input
                                    type="text"
                                    value={hl}
                                    onChange={(e) => setHl(e.target.value)}
                                    placeholder="e.g., en"
                                    className="w-full p-2 border border-gray-300 rounded"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Number of results (num)</label>
                                <input
                                    type="number"
                                    value={num}
                                    onChange={(e) => setNum(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Engine</label>
                                <input
                                    type="text"
                                    value={engine}
                                    onChange={(e) => setEngine(e.target.value)}
                                    placeholder="e.g., google"
                                    className="w-full p-2 border border-gray-300 rounded"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Google Domain</label>
                                <input
                                    type="text"
                                    value={googleDomain}
                                    onChange={(e) => setGoogleDomain(e.target.value)}
                                    placeholder="e.g., google.com"
                                    className="w-full p-2 border border-gray-300 rounded"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}

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

                {rawResponse && (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded">
                        <h3 className="text-lg font-semibold mb-2">Search Call</h3>
                        <pre className="text-sm overflow-auto max-h-60">
                            {JSON.stringify(rawResponse, null, 4)}
                        </pre>
                    </div>
                )}

                {results && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Results</h2>
                        {results.map((result, index) => (
                            <div key={index} className="border p-4 rounded bg-gray-50">
                                <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 font-bold hover:underline"
                                >
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
