'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '../components/Homepage/Card';
import { $createAgentAction } from './actions';

export function AddAgentButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleAddAgent = async () => {
        setIsLoading(true);
        const agentName = await $createAgentAction();
        // TODO: Add proper error handling and UI feedback
        if (agentName) {
            router.push(`/agents/${agentName}`);
        } else {
            router.refresh();
            setIsLoading(false);
        }
    };

    return (
        <div
            onClick={isLoading ? undefined : handleAddAgent}
            className={`cursor-pointer h-full group ${isLoading ? 'pointer-events-none' : ''}`}
        >
            <Card className="flex items-center justify-center text-lg font-medium text-gray-500 group-hover:text-blue-500 group-hover:border-blue-400 border-dashed border-2">
                {isLoading ? (
                    <>
                        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                        Creating agent...
                    </>
                ) : (
                    '+ Add New Agent'
                )}
            </Card>
        </div>
    );
}
