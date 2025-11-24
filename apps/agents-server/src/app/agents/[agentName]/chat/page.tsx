'use server';

import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { AgentChatWrapper } from './AgentChatWrapper';

export const generateMetadata = generateAgentMetadata;

export default async function AgentChatPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    const agentUrl = `/agents/${agentName}`;

    return (
        <main className={`w-screen h-screen`}>
            <AgentChatWrapper agentUrl={agentUrl} />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
