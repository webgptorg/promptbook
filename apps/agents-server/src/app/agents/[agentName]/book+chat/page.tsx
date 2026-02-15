'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { getMetadata } from '@/src/database/getMetadata';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { headers } from 'next/headers';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { isAgentDeleted } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { AgentBookAndChat } from './AgentBookAndChat';

export const generateMetadata = generateAgentMetadata;

export default async function AgentBookAndChatPage({ params }: { params: Promise<{ agentName: string }> }) {
    const requestHeaders = await headers();
    $sideEffect(requestHeaders);

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
    const agentSource = await collection.getAgentSource(agentName);
    const agentUrl = `/agents/${agentName}`;
    const thinkingMessages = await getThinkingMessages();
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const chatFailMessage = await getMetadata('CHAT_FAIL_MESSAGE');

    return (
        <div className={`agents-server-viewport-width h-[calc(100dvh-60px)] relative`}>
            <AgentBookAndChat
                agentName={agentName}
                initialAgentSource={agentSource}
                agentUrl={agentUrl}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                chatFailMessage={chatFailMessage ?? undefined}
            />
        </div>
    );
}
