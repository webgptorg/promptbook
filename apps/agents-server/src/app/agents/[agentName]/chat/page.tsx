'use server';
import { loadChatConfiguration } from '@/src/utils/chatConfiguration';
import { ensureChatHistoryIdentity } from '@/src/utils/currentUserIdentity';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { headers } from 'next/headers';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { PrintHeader } from '../../../../components/PrintHeader/PrintHeader';
import { getAgentProfile, isAgentDeleted } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { AgentChatHistoryClient } from './AgentChatHistoryClient';

export const generateMetadata = generateAgentMetadata;

/**
 * Parses URL flag values used for boolean query params.
 */
function parseBooleanFlag(value: string | undefined): boolean {
    if (!value) {
        return false;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export default async function AgentChatPage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ message?: string; chat?: string; newChat?: string }>;
}) {
    const requestHeaders = await headers();
    $sideEffect(requestHeaders);
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);
    const { message, chat, newChat } = await searchParams;

    const isDeleted = await isAgentDeleted(agentName);
    const agentProfile = await getAgentProfile(agentName);

    if (isDeleted) {
        return (
            <main className="agents-server-viewport-width h-full flex items-center justify-center p-8">
                <DeletedAgentBanner />
            </main>
        );
    }

    const agentUrl = `/agents/${agentName}`;
    const thinkingMessages = await getThinkingMessages();
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const historyIdentityAvailable = await ensureChatHistoryIdentity();
    const { chatFailMessage, isFileAttachmentsEnabled, isFeedbackEnabled } = await loadChatConfiguration();
    const agentDisplayName = agentProfile.meta.fullname || agentProfile.agentName || agentName;

    return (
        <main className={`w-full h-full overflow-hidden relative agent-chat-route-surface print-export-chat-surface`}>
            <PrintHeader title={`Chat with ${agentDisplayName}`} />
            <AgentChatHistoryClient
                agentName={agentName}
                agentUrl={agentUrl}
                initialAutoExecuteMessage={message}
                initialChatId={chat}
                initialForceNewChat={parseBooleanFlag(newChat)}
                brandColor={agentProfile.meta.color}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                isHistoryEnabled={historyIdentityAvailable}
                chatFailMessage={chatFailMessage ?? undefined}
                areFileAttachmentsEnabled={isFileAttachmentsEnabled}
                isFeedbackEnabled={isFeedbackEnabled}
            />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
