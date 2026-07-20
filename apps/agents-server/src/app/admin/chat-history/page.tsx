import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ChatHistoryClient } from './ChatHistoryClient';

/**
 * Props for admin chat history page.
 */
type AdminChatHistoryPageProps = {
    searchParams?: Promise<{
        agentName?: string;
        chatId?: string;
        view?: string;
    }>;
};

/**
 * Handles admin chat history page.
 */
export default async function AdminChatHistoryPage({ searchParams }: AdminChatHistoryPageProps) {
    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    const resolvedSearchParams = await searchParams;
    const initialAgentName = resolvedSearchParams?.agentName || undefined;
    const initialChatId = resolvedSearchParams?.chatId || undefined;
    const initialViewMode = resolvedSearchParams?.view === 'chat' ? 'chat' : undefined;

    return (
        <ChatHistoryClient
            initialAgentName={initialAgentName}
            initialChatId={initialChatId}
            initialViewMode={initialViewMode}
        />
    );
}
