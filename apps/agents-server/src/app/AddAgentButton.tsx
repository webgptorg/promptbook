'use client';

import { $createAgentAction } from './actions';

export function AddAgentButton() {
    const handleAddAgent = async () => {
        await $createAgentAction();
        // TODO: Add proper error handling and UI feedback
        window.location.reload(); // Refresh to show the new agent
    };

    return (
        <div
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 hover:border-blue-400 cursor-pointer"
            onClick={handleAddAgent}
        >
            + Add New Agent
        </div>
    );
}
