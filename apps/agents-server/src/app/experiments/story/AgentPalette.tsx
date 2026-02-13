'use client';

import { useState } from 'react';
import type { StoryAvailableAgent } from './storyUtils';

/**
 * Props for the Story agent picker.
 */
type AgentPaletteProps = {
    availableAgents: ReadonlyArray<StoryAvailableAgent>;
    selectedAgentNames: ReadonlyArray<string>;
    onAddAgent: (agentName: string) => void;
};

/**
 * Dropdown that adds existing server agents into the active story.
 */
export function AgentPalette({ availableAgents, selectedAgentNames, onAddAgent }: AgentPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectableAgents = availableAgents.filter((agent) => !selectedAgentNames.includes(agent.agentName));

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                Add agent
            </button>
            {isOpen && (
                <div className="absolute bottom-full right-0 z-10 mb-2 w-72 max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                    {selectableAgents.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500">All available agents are already added.</p>
                    ) : (
                        <ul className="space-y-1">
                            {selectableAgents.map((agent) => (
                                <li key={agent.agentName}>
                                    <button
                                        onClick={() => {
                                            onAddAgent(agent.agentName);
                                            setIsOpen(false);
                                        }}
                                        className="w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        {agent.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
