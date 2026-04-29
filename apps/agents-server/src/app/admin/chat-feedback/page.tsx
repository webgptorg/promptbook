import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { getCurrentUser } from '../../../utils/getCurrentUser';
import { ChatFeedbackClient } from './ChatFeedbackClient';

/**
 * Props for admin chat feedback page.
 */
type AdminChatFeedbackPageProps = {
    searchParams?: Promise<{
        agentName?: string;
    }>;
};

/**
 * Handles admin chat feedback page.
 */
export default async function AdminChatFeedbackPage({ searchParams }: AdminChatFeedbackPageProps) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return <ForbiddenPage />;
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const initialAgentName = resolvedSearchParams?.agentName || undefined;

    return <ChatFeedbackClient initialAgentName={initialAgentName} />;
}
