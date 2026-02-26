'use server';

import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabase } from '@/src/database/$provideSupabase';
import { $provideServer } from '@/src/tools/$provideServer';
import { getMetadata } from '@/src/database/getMetadata';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { formatAgentNamingText } from '@/src/utils/agentNaming';
import { getAgentNaming } from '@/src/utils/getAgentNaming';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { Ban, BoxIcon, CodeIcon, GlobeIcon, LayoutDashboard } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import spaceTrim from 'spacetrim';
import { Color } from '../../../../../../../src/utils/color/Color';
import { resolveAgentAvatarImageUrl } from '../../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { withAlpha } from '../../../../../../../src/utils/color/operators/withAlpha';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { CodePreview } from '../../../../../../_common/components/CodePreview/CodePreview';
import { getAgentName, getAgentProfile } from '../_utils';
import { getAgentLinks } from '../agentLinks';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { ApiKeyIntegrationSections } from './ApiKeyIntegrationSections';
import { PromptbookSdkTabs } from './PromptbookSdkTabs';
import { WebsiteIntegrationTabs } from './WebsiteIntegrationTabs';
import { parseBooleanMetadataFlag } from '@/src/utils/metadataFlags';

export const generateMetadata = generateAgentMetadata;

/**
 * Props for AgentIntegrationPage.
 */
type AgentIntegrationPageProps = {
    params: Promise<{ agentName: string }>;
};

/**
 * Renders the integration options page for a specific agent.
 */
export default async function AgentIntegrationPage({ params }: AgentIntegrationPageProps) {
    $sideEffect(headers());

    const agentName = await getAgentName(params);
    const isAdmin = await isUserAdmin();
    const agentNaming = await getAgentNaming();
    const isEmbeddingAllowed = parseBooleanMetadataFlag(await getMetadata('IS_EMBEDDING_ALLOWED'), true);

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
    let hasApiKey = false;
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
            hasApiKey = true;
        }
    }

    // Extract brand color from meta
    const brandColor = Color.from(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const backgroundColor = (await brandColor.then(withAlpha(0.05))).toHex();
    const borderColor = (await brandColor.then(withAlpha(0.1))).toHex();
    const primaryColor = (await brandColor).toHex();

    // Website Integration Code
    const { fullname, color, image, ...restMeta } = agentProfile.meta;
    const websiteIntegrationReactCode = spaceTrim(
        (block) => `
            import { PromptbookAgentIntegration } from '@promptbook/components';

            export function YourComponent() {
                return(
                    <PromptbookAgentIntegration
                        agentUrl="${baseUrl}"
                        meta={${block(JSON.stringify({ fullname, color, image, ...restMeta }, null, 4))}}
                    />
                );
            }
        `,
    );

    // HTML Integration Code - use single quotes for meta attribute to allow JSON with double quotes inside
    const metaJsonString = JSON.stringify({ fullname, color, image, ...restMeta }, null, 4);
    const websiteIntegrationHtmlCode = spaceTrim(
        (block) => `
            <script src="${publicUrl.href}api/embed.js" async defer></script>

            <promptbook-agent-integration
                agent-url="${baseUrl}"
                meta='${block(metaJsonString)}'
            />
        `,
    );

    const encodedMetaParam = encodeURIComponent(metaJsonString);
    const embedPageUrl = `${publicUrl.href}embed`;
    const embedIframeUrl = `${embedPageUrl}?agentUrl=${encodeURIComponent(baseUrl)}&meta=${encodedMetaParam}`;
    const embedIframeCode = spaceTrim(`
        <iframe
            src="${embedIframeUrl}"
            width="420"
            height="640"
            style="border: none; border-radius: 14px;"
            title="Promptbook agent embed"
        ></iframe>
    `);

    // Promptbook SDK Integration Code
    const promptbookSdkNodeCode = spaceTrim(`
        import { RemoteAgent } from '@promptbook/core';

        async function main() {
            const agent = await RemoteAgent.connect({
                agentUrl: '${baseUrl}',
            });

            const result = await agent.callChatModel({
                title: 'Remote chat',
                content: 'Hello from another agent!',
                parameters: {},
                modelRequirements: {
                    modelVariant: 'CHAT',
                },
            });

            console.log(result.content);
        }

        main();
    `);

    const promptbookSdkBrowserCode = spaceTrim(`
        import { useEffect, useMemo, useState } from 'react';
        import { AgentChat } from '@promptbook/components';
        import { RemoteAgent } from '@promptbook/core';

        export function RemoteAgentChat() {
            const agentUrl = '${baseUrl}';
            const agentPromise = useMemo(() => RemoteAgent.connect({ agentUrl }), [agentUrl]);
            const [agent, setAgent] = useState<RemoteAgent | null>(null);

            useEffect(() => {
                let isMounted = true;

                agentPromise.then((connectedAgent) => {
                    if (isMounted) {
                        setAgent(connectedAgent);
                    }
                });

                return () => {
                    isMounted = false;
                };
            }, [agentPromise]);

            if (!agent) {
                return <div>Connecting to agent...</div>;
            }

            return <AgentChat agent={agent} visual="STANDALONE" />;
        }
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

    const agentLinks = getAgentLinks(agentProfile.permanentId || agentName, (text) =>
        formatAgentNamingText(text, agentNaming),
    );
    // const chatLink = agentLinks.find((link) => link.id === 'chat')!;
    const websiteIntegrationLink = agentLinks.find((link) => link.id === 'website')!;

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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={
                            resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl.href }) ||
                            `/agents/${encodeURIComponent(agentProfile.permanentId || agentName)}/images/default-avatar.png`
                        }
                        alt={agentProfile.meta.fullname || agentName}
                        className="w-16 h-16 rounded-full object-cover border-2"
                        style={{ borderColor: primaryColor }}
                    />
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">{agentProfile.meta.fullname || agentName}</h1>
                        <p className="text-gray-500 flex items-center gap-2">
                            <CodeIcon className="w-4 h-4" />
                            Integration Options
                        </p>
                    </div>
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
                                    {formatAgentNamingText(
                                        'Embed the agent chat widget directly into your React application.',
                                        agentNaming,
                                    )}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    <Link href={websiteIntegrationLink.href} className="text-blue-600 hover:underline">
                                        View detailed guide &rarr;
                                    </Link>
                                </p>
                            </div>
                        </div>
                        <WebsiteIntegrationTabs
                            reactCode={websiteIntegrationReactCode}
                            htmlCode={websiteIntegrationHtmlCode}
                        />
                    </div>

                    {/* Iframe Embedding */}
                    {isEmbeddingAllowed ? (
                        <div className="p-6 rounded-xl border-2 border-blue-200 bg-blue-50/30 shadow-sm">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 rounded-xl bg-blue-100 text-blue-600 shadow-sm">
                                    <LayoutDashboard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Iframe Embedding</h2>
                                    <p className="text-gray-600">
                                        {formatAgentNamingText(
                                            'Embed the agent anywhere with a plain iframe that loads the embed route.',
                                            agentNaming,
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Embedding reuses this agent’s metadata so the widget matches the published style.
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formatAgentNamingText('Keep the metadata flag', agentNaming)}{' '}
                                        <code>IS_EMBEDDING_ALLOWED</code> {formatAgentNamingText('set to true.', agentNaming)}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr),300px]">
                                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Embed code
                                    </div>
                                    <CodePreview code={embedIframeCode} language="xml" />
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Live preview
                                    </div>
                                    <div className="p-4 flex justify-center">
                                        <iframe
                                            src={embedIframeUrl}
                                            width="320"
                                            height="520"
                                            title="Promptbook agent embed preview"
                                            style={{
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '16px',
                                                width: '100%',
                                                height: '520px',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 rounded-xl border-2 border-red-200 bg-red-50/60 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-red-100 text-red-600 shadow-sm">
                                    <Ban className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Iframe embedding disabled</h2>
                                    <p className="text-gray-600">
                                        {formatAgentNamingText(
                                            'Embedding is currently blocked via metadata. Toggle',
                                            agentNaming,
                                        )}{' '}
                                        <code>IS_EMBEDDING_ALLOWED</code> {formatAgentNamingText('to true to show the snippet again.', agentNaming)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Promptbook SDK Integration */}
                    <div className="p-6 rounded-xl border-2 border-cyan-200 bg-cyan-50/30 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-cyan-100 text-cyan-600 shadow-sm">
                                <CodeIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Promptbook SDK</h2>
                                <p className="text-gray-600">
                                    {formatAgentNamingText(
                                        'Connect to this agent using the Promptbook SDK with RemoteAgent.',
                                        agentNaming,
                                    )}
                                </p>
                            </div>
                        </div>
                        <PromptbookSdkTabs
                            nodeCode={promptbookSdkNodeCode}
                            browserCode={promptbookSdkBrowserCode}
                        />
                    </div>

                    <ApiKeyIntegrationSections
                        agentName={agentName}
                        agentApiBase={agentApiBase}
                        isAdmin={isAdmin}
                        initialApiKey={apiKey}
                        hasApiKey={hasApiKey}
                    />

                    {/* MCP Integration */}
                    <div className="p-6 rounded-xl border-2 border-orange-200 bg-orange-50/30 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-orange-100 text-orange-600 shadow-sm">
                                <BoxIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">MCP Integration</h2>
                                <p className="text-gray-600">
                                    {formatAgentNamingText(
                                        'Use Model Context Protocol to connect this agent with compatible tools and IDEs (like Claude Desktop, Cursor, etc.).',
                                        agentNaming,
                                    )}
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
