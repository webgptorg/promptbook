import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { formatAgentNamingText } from '@/src/utils/agentNaming';
import { getAgentNaming } from '@/src/utils/getAgentNaming';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { HistoryIcon } from 'lucide-react';
import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { AgentHistoryBrowser } from './AgentHistoryBrowser';

/**
 * Generates metadata for the agent history page.
 *
 * @returns Metadata for the page.
 */
export async function generateMetadata() {
    const agentNaming = await getAgentNaming();
    return {
        title: formatAgentNamingText('Agent History', agentNaming),
    };
}

export default async function AgentHistoryPage({ params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    const collection = await $provideAgentCollectionForServer();
    const agentId = await collection.getAgentPermanentId(agentName);
    const history = await collection.listAgentHistory(agentId);
    const agentNaming = await getAgentNaming();

    return (
        <div className="mx-auto flex h-[calc(100dvh-60px)] max-w-6xl flex-col p-6">
            <header className="flex items-center gap-4 mb-8">
                <div className="bg-blue-100 p-3 rounded-full">
                    <HistoryIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">History: {agentName}</h1>
                    <p className="text-gray-600">
                        {formatAgentNamingText('Previous versions of this agent.', agentNaming)}
                    </p>
                </div>
            </header>
            <AgentHistoryBrowser agentName={agentName} history={history} />
        </div>
    );
}
