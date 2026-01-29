import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { DeletedAgentsList } from '../../components/Homepage/DeletedAgentsList';
import { isUserAdmin } from '../../utils/isUserAdmin';

export const metadata = {
    title: 'Recycle Bin',
};

export default async function RecycleBinPage() {
    const { publicUrl } = await $provideServer();
    const collection = await $provideAgentCollectionForServer();
    const deletedAgents = await collection.listDeletedAgents();
    const isAdmin = await isUserAdmin();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-16">
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
                    <DeletedAgentsList agents={deletedAgents} isAdmin={isAdmin} publicUrl={publicUrl} />
                )}
            </div>
        </div>
    );
}
