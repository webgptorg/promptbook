'use client';

import Editor from '@monaco-editor/react';
import { AgentBasicInformation, string_url } from '@promptbook-local/types';
import { ChevronDownIcon, CodeIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { resolveAgentAvatarImageUrl } from '../../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';

type Transpiler = {
    name: string;
    title: string;
};

type TranspilationResult = {
    code: string;
    transpiler: Transpiler;
};

function getLanguageFromTranspiler(transpilerName?: string): string {
    if (!transpilerName) return 'plaintext';

    // Map transpiler names to Monaco language identifiers
    if (transpilerName.includes('openai-sdk')) return 'javascript';
    if (transpilerName.includes('langchain') || transpilerName.includes('python')) return 'python';
    if (transpilerName.includes('markdown')) return 'markdown';

    // Default to plaintext for unknown transpilers
    return 'plaintext';
}

type AgentCodePageClientProps = {
    /**
     * The name of the agent
     */
    readonly agentName: string;

    /**
     * Base URL of the agents server
     *
     * Note: [👭] Using `string_url`, not `URL` object because we are passing prop from server to client.
     */
    readonly publicUrl: string_url;
};

export function AgentCodePageClient({ agentName, publicUrl }: AgentCodePageClientProps) {
    const [agentProfile, setAgentProfile] = useState<AgentBasicInformation | null>(null);
    const [transpilers, setTranspilers] = useState<Transpiler[]>([]);
    const [selectedTranspiler, setSelectedTranspiler] = useState<Transpiler | null>(null);
    const [transpiledCode, setTranspiledCode] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!agentName) return;

        // Fetch agent profile
        fetch(`/agents/${encodeURIComponent(agentName)}/api/profile`)
            .then((res) => res.json())
            .then((data) => setAgentProfile(data))
            .catch((err) => console.error('Error fetching agent profile:', err));

        // Fetch available transpilers
        fetch(`/agents/${encodeURIComponent(agentName)}/export-as-transpiled-code/api`)
            .then((res) => res.json())
            .then((data) => {
                setTranspilers(data.transpilers || []);
                if (data.transpilers && data.transpilers.length > 0) {
                    setSelectedTranspiler(data.transpilers[0]);
                }
            })
            .catch((err) => console.error('Error fetching transpilers:', err));
    }, [agentName]);

    const transpileCode = useCallback(
        async (transpilerName: string) => {
            setLoading(true);
            setError('');

            try {
                const response = await fetch(`/agents/${encodeURIComponent(agentName)}/export-as-transpiled-code/api`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ transpilerName }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to transpile code');
                }

                const result: TranspilationResult = await response.json();
                setTranspiledCode(result.code);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to transpile code');
                setTranspiledCode('');
            } finally {
                setLoading(false);
            }
        },
        [agentName],
    );

    useEffect(() => {
        if (selectedTranspiler && agentName) {
            transpileCode(selectedTranspiler.name);
        }
    }, [selectedTranspiler, agentName, transpileCode]);

    if (!agentProfile) {
        return (
            <div className="min-h-screen p-6 md:p-12 flex flex-col items-center bg-gray-50">
                <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                    <div className="text-center">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-12 flex flex-col items-center bg-gray-50">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center gap-4">
                    {/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */}

                    <img
                        src={
                            resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl }) ||
                            `/agents/${encodeURIComponent(
                                agentProfile.permanentId || agentName,
                            )}/images/default-avatar.png`
                        }
                        alt={agentProfile.meta.fullname || agentName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />

                    <div className="flex-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <h1 className="text-2xl font-bold text-gray-900">
                            {(agentProfile as any)?.meta?.fullname || agentName}
                        </h1>
                        <p className="text-gray-500 flex items-center gap-2">
                            <CodeIcon className="w-4 h-4" />
                            Generated Code
                        </p>
                    </div>
                </div>

                <div className="p-6">
                    {/* Transpiler Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Transpiler</label>
                        <div className="relative">
                            <select
                                value={selectedTranspiler?.name || ''}
                                onChange={(e) => {
                                    const transpiler = transpilers.find((t) => t.name === e.target.value);
                                    if (transpiler) setSelectedTranspiler(transpiler);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {transpilers.map((transpiler) => (
                                    <option key={transpiler.name} value={transpiler.name}>
                                        {transpiler.title}
                                    </option>
                                ))}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Code Display */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {selectedTranspiler?.title || 'Generated Code'}
                            </h2>
                            {loading && <div className="text-sm text-gray-500">Generating...</div>}
                        </div>
                        <div className="p-4">
                            {error && (
                                <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded border border-red-200">
                                    {error}
                                </div>
                            )}
                            {transpiledCode ? (
                                <div className="h-96 border border-gray-200 rounded">
                                    <Editor
                                        value={transpiledCode}
                                        language={getLanguageFromTranspiler(selectedTranspiler?.name)}
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            lineNumbers: 'on',
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            wordWrap: 'on',
                                        }}
                                        loading={
                                            <div className="flex items-center justify-center h-full text-gray-500">
                                                Loading editor...
                                            </div>
                                        }
                                    />
                                </div>
                            ) : loading ? (
                                <div className="text-gray-500 text-center py-8">Generating code...</div>
                            ) : (
                                <div className="text-gray-500 text-center py-8">
                                    Select a transpiler to generate code
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
