'use server';

import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { isAgentDeleted } from '../_utils';
import { BackToAgentButton } from '@/src/components/BackToAgentButton/BackToAgentButton';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';
import { getAgentProfile } from '../_utils';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';

export const generateMetadata = generateAgentMetadata;

export default async function AgentChatPage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ message?: string }>;
}) {
    $sideEffect(headers());
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);
    const { message } = await searchParams;

    const isDeleted = await isAgentDeleted(agentName);
    const agentProfile = await getAgentProfile(agentName);

    if (isDeleted) {
        return (
            <main className="w-screen h-screen flex items-center justify-center p-8">
                <DeletedAgentBanner />
            </main>
        );
    }

    const agentUrl = `/agents/${agentName}`;
    const thinkingMessages = await getThinkingMessages();

    return (
        <main className={`w-full h-full overflow-hidden relative`}>
            <BackToAgentButton agentName={agentName} />
            <AgentChatWrapper
                agentUrl={agentUrl}
                autoExecuteMessage={message}
                brandColor={agentProfile.meta.color}
                thinkingMessages={thinkingMessages}
            />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
