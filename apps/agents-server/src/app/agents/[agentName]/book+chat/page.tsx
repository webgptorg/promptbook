'use server';

import { loadChatConfiguration } from '@/src/utils/chatConfiguration';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { getSignedInUserForAgentAccess } from '@/src/utils/agentAccess';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { headers } from 'next/headers';
import { forbidden } from 'next/navigation';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { isAgentDeleted } from '../_utils';
import { AgentBookAndChat } from './AgentBookAndChat';

/**
 * Handles agent book and chat page.
 */
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

    if (!(await getSignedInUserForAgentAccess())) {
        forbidden();
    }

    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);
    const agentUrl = `/agents/${agentName}`;
    const thinkingMessages = await getThinkingMessages();
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const { chatFailMessage, isFileAttachmentsEnabled, feedbackMode } = await loadChatConfiguration();

    return (
        <div className={`agents-server-viewport-width h-[calc(100dvh-60px)] relative`}>
            <AgentBookAndChat
                agentName={agentName}
                initialAgentSource={agentSource}
                agentUrl={agentUrl}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                chatFailMessage={chatFailMessage ?? undefined}
                areFileAttachmentsEnabled={isFileAttachmentsEnabled}
                feedbackMode={feedbackMode}
            />
        </div>
    );
}
