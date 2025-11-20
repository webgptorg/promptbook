'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { BookEditorWrapper } from './BookEditorWrapper';

export default async function AgentBookPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());

    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);
    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(decodeURIComponent(agentName));

    return (
        <main className={`w-screen h-screen`}>
            <BookEditorWrapper agentName={agentName} initialAgentSource={agentSource} />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wrapper around proper agent logic and components
 */
