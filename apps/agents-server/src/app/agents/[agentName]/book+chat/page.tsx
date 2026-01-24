'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { isAgentDeleted } from '../_utils';
import { BackToAgentButton } from '@/src/components/BackToAgentButton/BackToAgentButton';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { AgentBookAndChat } from './AgentBookAndChat';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';

export const generateMetadata = generateAgentMetadata;

export default async function AgentBookAndChatPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());

    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    const isDeleted = await isAgentDeleted(agentName);

    if (isDeleted) {
        return (
            <div className="w-screen h-[calc(100vh-60px)] flex items-center justify-center p-8">
                <DeletedAgentBanner />
            </div>
        );
    }

    if (!(await isUserAdmin())) {
        /* <- TODO: [👹] Here should be user permissions */
        return <ForbiddenPage />;
    }

    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);
    const agentUrl = `/agents/${agentName}`;

    return (
        <div className={`w-screen h-[calc(100vh-60px)] relative`}>
            <div className="absolute top-5 right-10 z-50">
                <BackToAgentButton agentName={agentName} />
            </div>
            <AgentBookAndChat agentName={agentName} initialAgentSource={agentSource} agentUrl={agentUrl} />
        </div>
    );
}
