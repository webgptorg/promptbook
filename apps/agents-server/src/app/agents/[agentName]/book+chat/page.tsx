'use server';

import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { loadChatConfiguration } from '@/src/utils/chatConfiguration';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { getThinkingMessages, resolveThinkingMessages } from '@/src/utils/thinkingMessages';
import { headers } from 'next/headers';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { enforceCanonicalLocalAgentId, getAgentName, getAgentProfile, isAgentDeleted } from '../_utils';
import { AgentBookAndChat } from './AgentBookAndChat';

/**
 * Builds canonical split book/chat path for one local agent id.
 */
function buildCanonicalAgentBookAndChatPath(canonicalAgentId: string): string {
    return `/agents/${encodeURIComponent(canonicalAgentId)}/book+chat`;
}

/**
 * Handles agent book and chat page.
 */
export default async function AgentBookAndChatPage({ params }: { params: Promise<{ agentName: string }> }) {
    const requestHeaders = await headers();
    $sideEffect(requestHeaders);

    const agentIdentifier = await getAgentName(params);
    const agentName = await enforceCanonicalLocalAgentId(agentIdentifier, buildCanonicalAgentBookAndChatPath);

    const isDeleted = await isAgentDeleted(agentName);

    if (isDeleted) {
        return (
            <div className="agents-server-viewport-width h-[calc(100dvh-60px)] flex items-center justify-center p-8">
                <DeletedAgentBanner />
            </div>
        );
    }

    if (!(await getCurrentUser())) {
        return <ForbiddenPage />;
    }

    const collection = await $provideAgentCollectionForServer();
    const agentSourcePromise = collection.getAgentSource(agentName);
    const agentProfilePromise = getAgentProfile(agentName);
    const serverThinkingMessagesPromise = getThinkingMessages();
    const agentUrl = `/agents/${encodeURIComponent(agentName)}`;
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const chatConfigurationPromise = loadChatConfiguration();
    const [
        agentSource,
        agentProfile,
        serverThinkingMessages,
        { chatFailMessage, isFileAttachmentsEnabled, feedbackMode },
    ] = await Promise.all([
        agentSourcePromise,
        agentProfilePromise,
        serverThinkingMessagesPromise,
        chatConfigurationPromise,
    ]);
    const thinkingMessages = resolveThinkingMessages(agentProfile.thinkingMessages, serverThinkingMessages);

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
