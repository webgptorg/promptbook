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
        <div onClick={handleAddAgent} className="cursor-pointer">
            <Card>+ Add New Agent</Card>
        </div>
    );
}
