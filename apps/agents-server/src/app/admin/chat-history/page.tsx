import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
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
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    const initialAgentName = (await searchParams)?.agentName || undefined;

    return <ChatHistoryClient initialAgentName={initialAgentName} />;
}
