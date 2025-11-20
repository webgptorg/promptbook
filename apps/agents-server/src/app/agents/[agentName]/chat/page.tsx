'use server';

import { AgentChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
// import { RemoteLlmExecutionTools } from '@promptbook-local/remote-client';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';

export default async function AgentChatPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());
    const { agentName } = await params;

    const agent = await RemoteAgent.connect({
        agentUrl: `/agents/${agentName}`,
        isVerbose: true,
    });

    return (
        <main className={`w-screen h-screen`}>
            <AgentChat className={`w-full h-full`} agent={agent} />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
