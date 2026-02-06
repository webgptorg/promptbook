'use server';

import { BackToAgentButton } from '@/src/components/BackToAgentButton/BackToAgentButton';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { formatAgentNamingText } from '@/src/utils/agentNaming';
import { getAgentNaming } from '@/src/utils/getAgentNaming';
import { PromptbookAgentIntegration } from '@promptbook-local/components';
import { parseAgentSource } from '@promptbook-local/core';
import { headers } from 'next/headers';
import spaceTrim from 'spacetrim';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { just } from '../../../../../../../src/utils/organization/just';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { WebsiteIntegrationTabs } from '../integration/WebsiteIntegrationTabs';

export const generateMetadata = generateAgentMetadata;

/**
 * Renders website integration guidance for a single agent.
 *
 * @param params - Route params containing the agent name.
 * @returns Website integration page UI.
 */
export default async function WebsiteIntegrationAgentPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);
    const agentNaming = await getAgentNaming();

    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);
    const { meta } = parseAgentSource(agentSource);
    const { fullname, color, image, ...restMeta } = meta;
    const { publicUrl } = await $provideServer();
    const agentUrl = `${publicUrl.href}agents/${encodeURIComponent(agentName)}`;

    const reactCode = spaceTrim(
        (block) => `
            import { PromptbookAgentIntegration } from '@promptbook/components';

            export function YourComponent() {
                return(
                    <PromptbookAgentIntegration
                        agentUrl="${agentUrl}"
                        meta={${block(JSON.stringify({ fullname, color, image, ...restMeta }, null, 4))}}
                    />
                );
            }
        `,
    );

    // HTML Integration Code - use single quotes for meta attribute to allow JSON with double quotes inside
    const metaJsonString = JSON.stringify({ fullname, color, image, ...restMeta }, null, 4);
    const htmlCode = spaceTrim(
        (block) => `
            <script src="${publicUrl.href}api/embed.js" async defer></script>

            <promptbook-agent-integration
                agent-url="${agentUrl}"
                meta='${block(metaJsonString)}'
            />
        `,
    );

    return (
        <main className="w-screen h-screen p-4">
            <div className="flex items-center gap-4 p-4 border-b">
                <h1 className="text-2xl font-bold flex-1">{meta.fullname || agentName} Integration Code</h1>
                <BackToAgentButton agentName={agentName} />
            </div>
            <p className="mt-4 mb-8 text-gray-600">
                {formatAgentNamingText('Use the following code to integrate the', agentNaming)}{' '}
                <strong>{meta.fullname || agentName}</strong>{' '}
                {formatAgentNamingText('agent into your React application using the', agentNaming)}{' '}
                <code>{'<PromptbookAgent />'}</code> component.
            </p>

            <WebsiteIntegrationTabs reactCode={reactCode} htmlCode={htmlCode} />
            {just(false) && (
                <PromptbookAgentIntegration
                    // formfactor="profile"
                    agentUrl={agentUrl}
                    meta={meta}
                    style={
                        {
                            // width: '400px',
                            // height: '600px',
                            // outline: `2px solid red`
                        }
                    }
                />
            )}
            {htmlCode}
            {just(true) && <div dangerouslySetInnerHTML={{ __html: htmlCode }} />}
            {just(true) && <div dangerouslySetInnerHTML={{ __html: `<h1>Test</h1>` }} />}
        </main>
    );
}

/**
 * TODO: Make this page better, bring from Promptbook.Studio
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
