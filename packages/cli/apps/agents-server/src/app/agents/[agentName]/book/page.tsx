'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { BookEditorWrapper } from './BookEditorWrapper';

export default async function AgentPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());

    const { agentName } = await params;
    const collection = await $provideAgentCollectionForServer();
    const agentSourceSubject = await collection.getAgentSource(decodeURIComponent(agentName));
    const agentSource = agentSourceSubject.getValue();

    return <BookEditorWrapper agentName={agentName} initialAgentSource={agentSource} />;
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wrapper around proper agent logic and components
 */
