'use server';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { headers } from 'next/headers';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { getAgentProfile, isAgentDeleted } from '../_utils';
import { AgentChatHistoryClient } from './AgentChatHistoryClient';
import { generateAgentMetadata } from '../generateAgentMetadata';

export const generateMetadata = generateAgentMetadata;

export default async function AgentChatPage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ message?: string; chat?: string }>;
}) {
    const requestHeaders = await headers();
    $sideEffect(requestHeaders);
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);
    const { message, chat } = await searchParams;

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
    const currentUser = await getCurrentUser();

    return (
        <main className={`w-full h-full overflow-hidden relative agent-chat-route-surface`}>
            <AgentChatHistoryClient
                agentName={agentName}
                agentUrl={agentUrl}
                initialAutoExecuteMessage={message}
                initialChatId={chat}
                brandColor={agentProfile.meta.color}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                isHistoryEnabled={Boolean(currentUser)}
            />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
