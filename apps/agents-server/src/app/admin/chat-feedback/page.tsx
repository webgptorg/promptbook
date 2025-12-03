import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ChatFeedbackClient } from './ChatFeedbackClient';

type AdminChatFeedbackPageProps = {
    searchParams?: Promise<{
        agentName?: string;
    }>;
};

export default async function AdminChatFeedbackPage({ searchParams }: AdminChatFeedbackPageProps) {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const initialAgentName = resolvedSearchParams?.agentName || undefined;

    return <ChatFeedbackClient initialAgentName={initialAgentName} />;
}
