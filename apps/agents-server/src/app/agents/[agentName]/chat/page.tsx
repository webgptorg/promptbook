'use server';

import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { isAgentDeleted } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { DeletedAgentBanner } from '../../../../components/DeletedAgentBanner';

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

    if (isDeleted) {
        return (
            <main className="w-screen h-screen flex items-center justify-center p-8">
                <DeletedAgentBanner message="This agent has been deleted. You can restore it from the Recycle Bin." />
            </main>
        );
    }

    const agentUrl = `/agents/${agentName}`;

    return (
        <main className={`w-screen h-screen`}>
            <AgentChatWrapper agentUrl={agentUrl} autoExecuteMessage={message} />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
