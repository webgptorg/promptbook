import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ChatHistoryClient } from './ChatHistoryClient';

type AdminChatHistoryPageProps = {
    searchParams?: {
        agentName?: string;
    };
};

export default async function AdminChatHistoryPage({ searchParams }: AdminChatHistoryPageProps) {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    const initialAgentName = searchParams?.agentName || undefined;

    return <ChatHistoryClient initialAgentName={initialAgentName} />;
}
