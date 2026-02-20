'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { isAgentDeleted } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { BookEditorWrapper } from './BookEditorWrapper';
import { loadBookConfiguration } from '@/src/utils/bookConfiguration';
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
    const bookConfig = await loadBookConfiguration();

    return (
        <div className={`agents-server-viewport-width h-[calc(100dvh-60px)] relative`}>
            <BookEditorWrapper
                agentName={agentName}
                initialAgentSource={agentSource}
                allowDocumentUploads={bookConfig.allowDocumentUploads}
                allowCameraUploads={bookConfig.allowCameraUploads}
            />
        </div>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wrapper around proper agent logic and components
 */
