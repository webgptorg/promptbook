'use server';

import { BackToAgentButton } from '@/src/components/BackToAgentButton/BackToAgentButton';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { headers } from 'next/headers';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { getAgentProfile, isAgentDeleted } from '../_utils';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { generateAgentMetadata } from '../generateAgentMetadata';

export const generateMetadata = generateAgentMetadata;

export default async function AgentChatPage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ message?: string }>;
}) {
    const requestHeaders = await headers();
    $sideEffect(requestHeaders);
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);
    const { message } = await searchParams;

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

    return (
        <main className={`w-full h-full overflow-hidden relative agent-chat-route-surface`}>
            <BackToAgentButton agentName={agentName} />
            <AgentChatWrapper
                agentUrl={agentUrl}
                autoExecuteMessage={message}
                brandColor={agentProfile.meta.color}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
            />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
