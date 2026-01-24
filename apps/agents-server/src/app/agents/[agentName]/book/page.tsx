'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { isAgentDeleted } from '../_utils';
import { BackToAgentMenuHoist } from '@/src/components/BackToAgentButton/BackToAgentMenuHoist';
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
    const agentSource = await collection.getAgentSource(decodeURIComponent(agentName));

    return (
        <div className={`w-screen h-[calc(100vh-60px)] relative`}>
            <BackToAgentMenuHoist agentName={agentName} />
            <BookEditorWrapper agentName={agentName} initialAgentSource={agentSource} />
        </div>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wrapper around proper agent logic and components
 */
