import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { ChatFeedbackClient } from './ChatFeedbackClient';

type AdminChatFeedbackPageProps = {
    searchParams?: {
        agentName?: string;
    };
};

export default async function AdminChatFeedbackPage({ searchParams }: AdminChatFeedbackPageProps) {
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        return <ForbiddenPage />;
    }

    const initialAgentName = searchParams?.agentName || undefined;

    return <ChatFeedbackClient initialAgentName={initialAgentName} />;
}
