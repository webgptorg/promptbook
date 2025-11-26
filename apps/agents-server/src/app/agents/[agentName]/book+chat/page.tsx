'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { AgentBookAndChat } from './AgentBookAndChat';

export const generateMetadata = generateAgentMetadata;

export default async function AgentBookAndChatPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());

    if (!(await isUserAdmin())) {
        /* <- TODO: [👹] Here should be user permissions */
        return <ForbiddenPage />;
    }

    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);
    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);
    const agentUrl = `/agents/${agentName}`;

    return (
        <div className={`w-screen h-[calc(100vh-60px)]`}>
            <AgentBookAndChat agentName={agentName} initialAgentSource={agentSource} agentUrl={agentUrl} />
        </div>
    );
}
