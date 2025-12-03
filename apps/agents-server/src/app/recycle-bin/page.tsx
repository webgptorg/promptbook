import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { RestoreAgentButton } from './RestoreAgentButton';

export const metadata = {
    title: 'Recycle Bin',
};

export default async function RecycleBinPage() {
    const collection = await $provideAgentCollectionForServer();
    const deletedAgents = await collection.listDeletedAgents();

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <header className="flex items-center gap-4 mb-8">
                <div className="bg-red-100 p-3 rounded-full">
                    <TrashIcon className="w-8 h-8 text-red-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Recycle Bin</h1>
                    <p className="text-gray-600">Restore deleted agents from here.</p>
                </div>
            </header>

            {deletedAgents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">Recycle bin is empty</p>
                    <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block">
                        Go back to agents
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {deletedAgents.map((agentName) => (
                        <div
                            key={agentName}
                            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-lg">
                                    {agentName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900">{agentName}</h3>
                                    <p className="text-sm text-gray-500">Deleted agent</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <RestoreAgentButton agentName={agentName} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
