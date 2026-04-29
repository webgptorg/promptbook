import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { getSignedInUserForAgentAccess } from '../../../utils/agentAccess';
import { ChatHistoryClient } from './ChatHistoryClient';

/**
 * Props for admin chat history page.
 */
type AdminChatHistoryPageProps = {
    searchParams?: Promise<{
        agentName?: string;
    }>;
};

/**
 * Handles admin chat history page.
 */
export default async function AdminChatHistoryPage({ searchParams }: AdminChatHistoryPageProps) {
    const signedInUser = await getSignedInUserForAgentAccess();

    if (!signedInUser) {
        return <ForbiddenPage />;
    }

    const initialAgentName = (await searchParams)?.agentName || undefined;

    return <ChatHistoryClient initialAgentName={initialAgentName} />;
}
