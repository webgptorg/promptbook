'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { getSignedInUserForAgentAccess } from '@/src/utils/agentAccess';
import { headers } from 'next/headers';
import { forbidden } from 'next/navigation';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { isAgentDeleted } from '../_utils';
import { BookEditorWrapper } from './BookEditorWrapper';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';

/**
 * Handles agent book page.
 */
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

    if (!(await getSignedInUserForAgentAccess())) {
        forbidden();
    }

    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(decodeURIComponent(agentName));

    return (
        <div className={`agents-server-viewport-width h-[calc(100dvh-60px)] relative`}>
            <BookEditorWrapper agentName={agentName} initialAgentSource={agentSource} />
        </div>
    );
}

// TODO: [🚗] Components and pages here should be just tiny UI wrapper around proper agent logic and components
