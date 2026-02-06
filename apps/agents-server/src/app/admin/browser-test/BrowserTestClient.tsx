'use client';

import { useState, useEffect } from 'react';
import { Card } from '../../../components/Homepage/Card';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';

export function BrowserTestClient() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [facebookStreamUrl, setFacebookStreamUrl] = useState<string | null>(null);
    const [goal, setGoal] = useState<string>('');
    const [plan, setPlan] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState<boolean>(false);
    const { formatText } = useAgentNaming();

    useEffect(() => {
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [imageUrl]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTakeScreenshot = async () => {
        setFacebookStreamUrl(null);
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/browser-test/screenshot');
            if (!response.ok) {
                const text = await response.text();
                let errorMessage;
                try {
                    const json = JSON.parse(text);
                    errorMessage = json.error || response.statusText;
                } catch {
                    errorMessage = text || response.statusText;
                }
                throw new Error(`Error: ${response.status} ${errorMessage}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleScrollFacebook = () => {
        setImageUrl(null);
        setError(null);
        setFacebookStreamUrl(`/api/browser-test/scroll-facebook?t=${Date.now()}`);
    };

    const handleActOnFacebook = async () => {
        setError(null);
        setIsLoading(true);
        // Start streaming view if not already started
        if (!facebookStreamUrl) {
            setFacebookStreamUrl(`/api/browser-test/scroll-facebook?t=${Date.now()}`);
        }

        try {
            const response = await fetch('/api/browser-test/act', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal, action: 'plan' }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Error: ${response.status} ${text}`);
            }

            const data = await response.json();
            setPlan(data.plan);
            setIsConfirming(true);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmAction = async () => {
        setError(null);
        setIsLoading(true);
        setIsConfirming(false);
        setPlan(null);

        try {
            const response = await fetch('/api/browser-test/act', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal, action: 'execute', plan }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Error: ${response.status} ${text}`);
            }

            const data = await response.json();
            // Optionally show success message
            console.log('Action executed:', data);
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
                    <h1 className="text-3xl text-gray-900 font-light">Browser Test</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Launch a browser instance and take a screenshot to verify functionality.
                    </p>
                </div>
            </div>

            <Card>
                <div className="mb-4">
                    <p className="mb-2">Click the button below to launch a browser instance (if not running), navigate to ptbk.io, and take a screenshot.</p>
                    <button
                        onClick={handleTakeScreenshot}
                        disabled={isLoading}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                    >
                        {isLoading ? 'Taking Screenshot...' : 'Take Screenshot'}
                    </button>
                    <button
                        onClick={handleScrollFacebook}
                        disabled={isLoading}
                        className="ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                    >
                        View Facebook Stream
                    </button>
                </div>

                <div className="mb-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{formatText('Goal for Agent')}</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="e.g., Like 5 posts about AI"
                            className="flex-1 p-2 border border-gray-300 rounded"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleActOnFacebook}
                            disabled={isLoading || !goal}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : 'Act on Facebook'}
                        </button>
                    </div>
                </div>

                {isConfirming && plan && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-4">
                        <h3 className="font-bold text-lg mb-2">Confirm Plan</h3>
                        <pre className="whitespace-pre-wrap bg-white p-3 border rounded mb-3 text-sm">{plan}</pre>
                        <div className="flex gap-2">
                            <button
                                onClick={handleConfirmAction}
                                className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded"
                            >
                                Confirm & Execute
                            </button>
                            <button
                                onClick={() => setIsConfirming(false)}
                                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {imageUrl && (
                    <div className="border rounded shadow-lg overflow-hidden">
                        <h2 className="text-xl font-semibold p-2 bg-gray-100">Screenshot</h2>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Screenshot of ptbk.io" className="w-full h-auto" />
                    </div>
                )}

                {facebookStreamUrl && (
                    <div className="border rounded shadow-lg overflow-hidden">
                        <h2 className="text-xl font-semibold p-2 bg-gray-100">Facebook Scroll Stream</h2>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={facebookStreamUrl} alt="Live stream of Facebook scrolling" className="w-full h-auto" />
                    </div>
                )}
            </Card>
        </div>
    );
}
