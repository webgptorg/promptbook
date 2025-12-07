'use server';

import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabase } from '@/src/database/$provideSupabase';
import { $provideServer } from '@/src/tools/$provideServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { ArrowLeftIcon, BoxIcon, CodeIcon, GlobeIcon, ServerIcon, TerminalIcon } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import spaceTrim from 'spacetrim';
import { Color } from '../../../../../../../src/utils/color/Color';
import { withAlpha } from '../../../../../../../src/utils/color/operators/withAlpha';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { CodePreview } from '../../../../../../_common/components/CodePreview/CodePreview';
import { CopyField } from '../CopyField';
import { getAgentName, getAgentProfile } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { SdkCodeTabs } from './SdkCodeTabs';

export const generateMetadata = generateAgentMetadata;

export default async function AgentIntegrationPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());
    const agentName = await getAgentName(params);
    const isAdmin = await isUserAdmin();

    let agentProfile;
    try {
        agentProfile = await getAgentProfile(agentName);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message.includes('Cannot coerce the result to a single JSON object') ||
                error.message.includes('JSON object requested, multiple (or no) results returned'))
        ) {
            notFound();
        }
        throw error;
    }

    const { publicUrl } = await $provideServer();
    const baseUrl = `${publicUrl.href}agents/${encodeURIComponent(agentName)}`;
    const agentApiBase = `${publicUrl.href}agents/${encodeURIComponent(agentName)}`;
    const rootUrl = publicUrl.href.replace(/\/$/, '');

    // Get API Key if admin
    let apiKey = 'ptbk_...';
    if (isAdmin) {
        const supabase = $provideSupabase();
        const table = await $getTableName('ApiTokens');
        const { data } = await supabase
            .from(table)
            .select('token')
            .eq('isRevoked', false)
            .order('createdAt', { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            apiKey = data[0].token;
        }
    }

    // Extract brand color from meta
    const brandColor = Color.from(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const backgroundColor = (await brandColor.then(withAlpha(0.05))).toHex();
    const borderColor = (await brandColor.then(withAlpha(0.1))).toHex();
    const primaryColor = (await brandColor).toHex();

    // Website Integration Code
    const { fullname, color, image, ...restMeta } = agentProfile.meta;
    const websiteIntegrationCode = spaceTrim(
        (block) => `
            import { PromptbookAgent } from '@promptbook/components';

            export function YourComponent() {
                return(
                    <PromptbookAgent
                        agentUrl="${baseUrl}"
                        meta={${block(JSON.stringify({ fullname, color, image, ...restMeta }, null, 4))}}
                    />
                );
            }
        `,
    );

    // OpenAI Compatible Curl
    const curlCode = spaceTrim(`
        curl ${agentApiBase}/api/openai/chat/completions \\
          -H "Content-Type: application/json" \\
          -H "Authorization: Bearer ${apiKey}" \\
          -d '{
            "model": "agent:${agentName}",
            "messages": [
              {"role": "user", "content": "Hello!"}
            ]
          }'
    `);

    // OpenAI Compatible Python
    const pythonCode = spaceTrim(`
        from openai import OpenAI

        client = OpenAI(
            base_url="${agentApiBase}/api/openai",
            api_key="${apiKey}",
        )

        response = client.chat.completions.create(
            model="agent:${agentName}",
            messages=[
                {"role": "user", "content": "Hello!"}
            ]
        )

        print(response.choices[0].message.content)
    `);

    // OpenAI Compatible JS
    const jsCode = spaceTrim(`
        import OpenAI from 'openai';

        const client = new OpenAI({
            baseURL: '${agentApiBase}/api/openai',
            apiKey: '${apiKey}',
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

    // MCP Config
    const mcpConfigCode = spaceTrim(`
        {
          "mcpServers": {
            "${agentName}": {
              "command": "npx",
              "args": [
                "-y",
                "@promptbook/cli",
                "mcp",
                "${baseUrl}"
              ]
            }
          }
        }
    `);

    return (
        <div
            className="min-h-screen p-6 md:p-12 flex flex-col items-center"
            style={{
                backgroundColor,
            }}
        >
            <div className="w-full max-w-5xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b flex items-center gap-4" style={{ borderColor }}>
                    {agentProfile.meta.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={agentProfile.meta.image as string}
                            alt={agentProfile.meta.fullname || agentName}
                            className="w-16 h-16 rounded-full object-cover border-2"
                            style={{ borderColor: primaryColor }}
                        />
                    )}
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">{agentProfile.meta.fullname || agentName}</h1>
                        <p className="text-gray-500 flex items-center gap-2">
                            <CodeIcon className="w-4 h-4" />
                            Integration Options
                        </p>
                    </div>
                    <Link
                        href={`/agents/${encodeURIComponent(agentName)}`}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        title="Back to Agent"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </Link>
                </div>

                <div className="p-6 space-y-6">
                    {/* Website Integration */}
                    <div className="p-6 rounded-xl border-2 border-green-200 bg-green-50/30 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-green-100 text-green-600 shadow-sm">
                                <GlobeIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Website Integration</h2>
                                <p className="text-gray-600">
                                    Embed the agent chat widget directly into your React application.
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    <Link
                                        href={`/agents/${encodeURIComponent(agentName)}/website-integration`}
                                        className="text-blue-600 hover:underline"
                                    >
                                        View detailed guide &rarr;
                                    </Link>
                                </p>
                            </div>
                        </div>
                        <CodePreview code={websiteIntegrationCode} language="typescript" />
                    </div>

                    {/* OpenAI API Compatible Endpoint */}
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
                                    <CopyField label="Endpoint URL" value={`${agentApiBase}/api/openai`} />
                                    <CopyField label="Model Name" value={`agent:${agentName}`} />
                                    {isAdmin ? (
                                        <CopyField label="API Key" value={apiKey} />
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                API Key
                                            </span>
                                            <div className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded border border-gray-200">
                                                Contact admin for API Key
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {isAdmin && apiKey === 'ptbk_...' && (
                                    <p className="text-sm text-amber-600 mt-2">
                                        No API token found.{' '}
                                        <Link href="/admin/api-tokens" className="underline font-medium">
                                            Create one in settings
                                        </Link>
                                        .
                                    </p>
                                )}
                            </div>
                        </div>

                        <SdkCodeTabs curlCode={curlCode} pythonCode={pythonCode} jsCode={jsCode} />
                    </div>

                    {/* OpenRouter Integration */}
                    <div className="p-6 rounded-xl border-2 border-purple-200 bg-purple-50/30 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-purple-100 text-purple-600 shadow-sm">
                                <ServerIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">OpenRouter Integration</h2>
                                <p className="text-gray-600">Connect via OpenRouter compatible endpoint.</p>
                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                    <CopyField label="Endpoint URL" value={`${agentApiBase}/api/openrouter`} />
                                    <CopyField label="Model Name" value={`agent:${agentName}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MCP Integration */}
                    <div className="p-6 rounded-xl border-2 border-orange-200 bg-orange-50/30 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-orange-100 text-orange-600 shadow-sm">
                                <BoxIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">MCP Integration</h2>
                                <p className="text-gray-600">
                                    Use Model Context Protocol to connect this agent with compatible tools and IDEs
                                    (like Claude Desktop, Cursor, etc.).
                                </p>
                            </div>
                        </div>
                        <CodePreview
                            code={mcpConfigCode.replace(rootUrl + '/api', agentApiBase + '/api')}
                            language="json"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
