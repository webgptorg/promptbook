'use client';

import { string_book } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '../components/Homepage/Card';
import { NewAgentDialog } from '../components/NewAgentDialog/NewAgentDialog';
import { $createAgentFromBookAction, $generateAgentBoilerplateAction } from './actions';

export function AddAgentButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [agentSource, setAgentSource] = useState<string_book>('' as string_book);

    const handleAddAgent = async () => {
        setIsLoading(true);
        try {
            const boilerplate = await $generateAgentBoilerplateAction();
            setAgentSource(boilerplate);
            setIsDialogOpen(true);
        } catch (error) {
            console.error('Failed to generate agent boilerplate', error);
            // TODO: Add proper error handling and UI feedback
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (source: string_book) => {
        // Note: [🧠] Logic for creation is now handled inside the dialog (waiting for promise), here we just handle navigation
        const { permanentId } = await $createAgentFromBookAction(source);

        if (permanentId) {
            router.push(`/agents/${permanentId}`);
        } else {
            router.refresh();
        }
    };

    return (
        <>
            <div
                onClick={isLoading ? undefined : handleAddAgent}
                className={`cursor-pointer h-full group ${isLoading ? 'pointer-events-none' : ''}`}
            >
                <Card className="flex items-center justify-center text-lg font-medium text-gray-500 group-hover:text-blue-500 group-hover:border-blue-400 border-dashed border-2">
                    {isLoading ? (
                        <>
                            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            Preparing...
                        </>
                    ) : (
                        '+ Add New Agent'
                    )}
                </Card>
            </div>

            <NewAgentDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                initialAgentSource={agentSource}
                onCreate={handleCreate}
            />
        </>
    );
}
