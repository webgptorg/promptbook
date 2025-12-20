import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { HistoryIcon } from 'lucide-react';
import Link from 'next/link';
import { RestoreVersionButton } from './RestoreVersionButton';

export const metadata = {
    title: 'Agent History',
};

export default async function AgentHistoryPage({ params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;
    const collection = await $provideAgentCollectionForServer();
    const agentId = await collection.getAgentIdByName(agentName);
    const history = await collection.listAgentHistory(agentId);

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <header className="flex items-center gap-4 mb-8">
                <div className="bg-blue-100 p-3 rounded-full">
                    <HistoryIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">History: {agentName}</h1>
                    <p className="text-gray-600">
                        Previous versions of this agent. <Link href={`/agents/${agentName}`} className="text-blue-600 hover:underline">Back to agent</Link>
                    </p>
                </div>
            </header>

            {history.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">No history found</p>
                </div>
            ) : (
                <div className="relative border-l border-gray-200 ml-4">
                    {history.map((item, index) => (
                        <div key={item.id} className="mb-8 ml-6">
                            <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white">
                                <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                            </span>
                            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <time className="block mb-1 text-sm font-normal leading-none text-gray-400">
                                            {new Date(item.createdAt).toLocaleString()}
                                        </time>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Version {history.length - index}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Hash: <code className="bg-gray-100 px-1 rounded">{item.agentHash.substring(0, 8)}</code>
                                        </p>
                                    </div>
                                    <RestoreVersionButton agentName={agentName} historyId={item.id} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
