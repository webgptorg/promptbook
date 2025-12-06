'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { PromptbookAgent } from '@promptbook-local/components';
import { parseAgentSource } from '@promptbook-local/core';
import { headers } from 'next/headers';
import spaceTrim from 'spacetrim';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { CodePreview } from '../../../../../../_common/components/CodePreview/CodePreview';
import { generateAgentMetadata } from '../generateAgentMetadata';

export const generateMetadata = generateAgentMetadata;

export default async function WebsiteIntegrationAgentPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);
    const { meta } = parseAgentSource(agentSource);
    const { fullname, color, image, ...restMeta } = meta;
    const { publicUrl } = await $provideServer();
    const agentUrl = `${publicUrl.href}agents/${encodeURIComponent(agentName)}`;

    const code = spaceTrim(
        (block) => `

            import { PromptbookAgent } from '@promptbook/components';

            export function YourComponent() {
                return(
                    <PromptbookAgent
                        agentUrl="${agentUrl}"
                        meta={${block(JSON.stringify({ fullname, color, image, ...restMeta }, null, 4))}}
                    />
                );
            }
            
        `,
    );

    return (
        <main className="w-screen h-screen p-4">
            <h1 className="text-2xl font-bold p-4 border-b">{meta.fullname || agentName} Integration Code</h1>
            <p className="mt-4 mb-8 text-gray-600">
                Use the following code to integrate the <strong>{meta.fullname || agentName}</strong> agent into your
                React application using the <code>{'<PromptbookAgent />'}</code> component.
            </p>

            <CodePreview code={code} />
            <PromptbookAgent agentUrl={agentUrl} meta={meta} />
        </main>
    );
}

/**
 * TODO: Make this page better, bring from Promptbook.Studio
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
