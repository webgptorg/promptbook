'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { isAgentDeleted } from '../_utils';
import { AgentChatBookSwitcher } from '@/src/components/AgentChatBookSwitcher/AgentChatBookSwitcher';
import { BackToAgentButton } from '@/src/components/BackToAgentButton/BackToAgentButton';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { BookEditorWrapper } from './BookEditorWrapper';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';

export const generateMetadata = generateAgentMetadata;

export default async function AgentBookPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());

    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    const isDeleted = await isAgentDeleted(agentName);

    if (isDeleted) {
        return (
            <div className="agents-server-viewport-width h-[calc(100dvh-60px)] flex items-center justify-center p-8">
                <DeletedAgentBanner />
            </div>
        );
    }

    if (!(await isUserAdmin())) {
        /* <- TODO: [👹] Here should be user permissions */
        return <ForbiddenPage />;
    }

    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(decodeURIComponent(agentName));

    return (
        <div className={`agents-server-viewport-width h-[calc(100dvh-60px)] relative`}>
            <div className="flex items-center gap-2 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
                <BackToAgentButton agentName={agentName} />
                <AgentChatBookSwitcher agentName={agentName} activeTab="book" />
            </div>
            <BookEditorWrapper agentName={agentName} initialAgentSource={agentSource} />
        </div>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wrapper around proper agent logic and components
 */
