'use client';

import { useRouter } from 'next/navigation';
import { Card } from '../components/Homepage/Card';
import { $createAgentAction } from './actions';

export function AddAgentButton() {
    const router = useRouter();

    const handleAddAgent = async () => {
        const agentName = await $createAgentAction();
        // TODO: Add proper error handling and UI feedback
        if (agentName) {
            router.push(`/agents/${agentName}`);
        } else {
            router.refresh();
        }
    };

    return (
        <div onClick={handleAddAgent} className="cursor-pointer h-full group">
            <Card className="flex items-center justify-center text-lg font-medium text-gray-500 group-hover:text-blue-500 group-hover:border-blue-400 border-dashed border-2">
                + Add New Agent
            </Card>
        </div>
    );
}
