import { AgentChatPageClient } from './AgentChatPageClient';

export default async function AgentChatPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string }>;
}) {
    const { message } = await searchParams;
    return <AgentChatPageClient autoExecuteMessage={message} />;
}
