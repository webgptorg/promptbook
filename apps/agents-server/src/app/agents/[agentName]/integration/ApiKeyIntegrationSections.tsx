'use client';

import { Plus, ServerIcon, TerminalIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import spaceTrim from 'spacetrim';
import { createApiToken } from '@/src/utils/apiTokensClient';
import { CopyField } from '../CopyField';
import { SdkCodeTabs } from './SdkCodeTabs';

/**
 * Props for ApiKeyIntegrationSections.
 */
type ApiKeyIntegrationSectionsProps = {
    agentName: string;
    agentApiBase: string;
    isAdmin: boolean;
    initialApiKey: string;
    hasApiKey: boolean;
};

/**
 * Renders OpenAI-compatible and OpenRouter integrations with API key creation.
 */
export function ApiKeyIntegrationSections({
    agentName,
    agentApiBase,
    isAdmin,
    initialApiKey,
    hasApiKey,
}: ApiKeyIntegrationSectionsProps) {
    const [apiKey, setApiKey] = useState(initialApiKey);
    const [apiKeyAvailable, setApiKeyAvailable] = useState(hasApiKey);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const apiKeyPlaceholder = 'ptbk_...';
    const apiKeyValue = apiKeyAvailable ? apiKey : apiKeyPlaceholder;

    /**
     * Creates an API key for the current agent and updates local state.
     */
    const handleCreateApiKey = async () => {
        if (!isAdmin || isCreating) {
            return;
        }

        setIsCreating(true);
        setCreateError(null);

        try {
            const note = `Created for Agent ${agentName}`;
            const token = await createApiToken(note);
            setApiKey(token.token);
            setApiKeyAvailable(true);
        } catch (error) {
            setCreateError(error instanceof Error ? error.message : 'Failed to create API key.');
        } finally {
            setIsCreating(false);
        }
    };

    const apiKeyField = isAdmin ? (
        apiKeyAvailable ? (
            <CopyField label="API Key" value={apiKeyValue} />
        ) : (
            <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">API Key</span>
                <div className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded border border-gray-200">
                    Create an API key to display it here.
                </div>
            </div>
        )
    ) : (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">API Key</span>
            <div className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded border border-gray-200">
                Contact admin for API Key
            </div>
        </div>
    );

    const curlCode = spaceTrim(`
        curl ${agentApiBase}/api/openai/v1/chat/completions \\
          -H "Content-Type: application/json" \\
          -H "Authorization: Bearer ${apiKeyValue}" \\
          -d '{
            "model": "agent:${agentName}",
            "messages": [
              {"role": "user", "content": "Hello!"}
            ]
          }'
    `);

    const pythonCode = spaceTrim(`
        from openai import OpenAI

        client = OpenAI(
            base_url="${agentApiBase}/api/openai/v1",
            api_key="${apiKeyValue}",
        )

        response = client.chat.completions.create(
            model="agent:${agentName}",
            messages=[
                {"role": "user", "content": "Hello!"}
            ]
        )

        print(response.choices[0].message.content)
    `);

    const jsCode = spaceTrim(`
        import OpenAI from 'openai';

        const client = new OpenAI({
            baseURL: '${agentApiBase}/api/openai/v1',
            apiKey: '${apiKeyValue}',
        });

        async function main() {
            const response = await client.chat.completions.create({
                model: 'agent:${agentName}',
                messages: [{ role: 'user', content: 'Hello!' }],
            });

            console.log(response.choices[0].message.content);
        }

        main();
    `);

    return (
        <>
            <div className="p-6 rounded-xl border-2 border-blue-200 bg-blue-50/30 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-blue-100 text-blue-600 shadow-sm">
                        <TerminalIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">OpenAI Compatible API</h2>
                        <p className="text-gray-600">
                            Use the agent as a drop-in replacement for OpenAI API in your existing applications.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4 mt-4 mb-2">
                            <CopyField label="Endpoint URL" value={`${agentApiBase}/api/openai/v1`} />
                            <CopyField label="Model Name" value={`agent:${agentName}`} />
                            {apiKeyField}
                        </div>
                        {isAdmin && !apiKeyAvailable && (
                            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="text-sm text-amber-700">
                                    No API key yet. Create one to start using the integrations below.
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCreateApiKey}
                                        disabled={isCreating}
                                        className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {isCreating ? 'Creating...' : 'Create API Key'}
                                    </button>
                                    <Link
                                        href="/admin/api-tokens"
                                        className="text-sm font-medium text-amber-800 underline underline-offset-2"
                                    >
                                        Manage keys
                                    </Link>
                                    <span className="text-xs text-amber-800">
                                        Note: &quot;Created for Agent {agentName}&quot;
                                    </span>
                                </div>
                                {createError && <p className="text-sm text-red-600">{createError}</p>}
                            </div>
                        )}
                    </div>
                </div>

                <SdkCodeTabs curlCode={curlCode} pythonCode={pythonCode} jsCode={jsCode} />
            </div>

            <div className="p-6 rounded-xl border-2 border-purple-200 bg-purple-50/30 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-purple-100 text-purple-600 shadow-sm">
                        <ServerIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">OpenRouter Integration</h2>
                        <p className="text-gray-600">Connect via OpenRouter compatible endpoint.</p>
                        <div className="grid md:grid-cols-3 gap-4 mt-4">
                            <CopyField label="Endpoint URL" value={`${agentApiBase}/api/openrouter`} />
                            <CopyField label="Model Name" value={`agent:${agentName}`} />
                            {apiKeyField}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
