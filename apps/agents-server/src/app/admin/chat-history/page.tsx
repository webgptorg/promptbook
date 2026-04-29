import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { getCurrentUser } from '../../../utils/getCurrentUser';
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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return <ForbiddenPage />;
    }

    const initialAgentName = (await searchParams)?.agentName || undefined;

    return <ChatHistoryClient initialAgentName={initialAgentName} />;
}
