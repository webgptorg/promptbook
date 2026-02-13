'use client';

import Image from 'next/image';
import { AgentPalette } from './AgentPalette';
import type { StoryAvailableAgent } from './storyUtils';

/**
 * Props for the selected-agents panel at the bottom of Story.
 */
type AgentsPanelProps = {
    availableAgents: ReadonlyArray<StoryAvailableAgent>;
    selectedAgentNames: ReadonlyArray<string>;
    onAgentClick: (agentName: string) => void;
    onAddAgent: (agentName: string) => void;
};

/**
 * Renders selected agents and lets the user trigger them to continue the story.
 */
export function AgentsPanel({ availableAgents, selectedAgentNames, onAgentClick, onAddAgent }: AgentsPanelProps) {
    const agentLabelMap = new Map(availableAgents.map((agent) => [agent.agentName, agent.label]));

    return (
        <div className="bg-gray-100 p-4 border-t">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold">Agents</h3>
                <AgentPalette
                    availableAgents={availableAgents}
                    selectedAgentNames={selectedAgentNames}
                    onAddAgent={onAddAgent}
                />
            </div>
            <div className="flex flex-wrap gap-4">
                {selectedAgentNames.length === 0 ? (
                    <p className="text-sm text-gray-500">Add agents to the story and click them to write continuation.</p>
                ) : (
                    selectedAgentNames.map((agentName) => {
                        const label = agentLabelMap.get(agentName) || agentName;

                        return (
                            <button
                                key={agentName}
                                onClick={() => onAgentClick(agentName)}
                                className="flex min-w-20 flex-col items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-200"
                            >
                                <Image
                                    src={`/agents/${encodeURIComponent(agentName)}/images/default-avatar.png`}
                                    alt={label}
                                    width={64}
                                    height={64}
                                    className="h-16 w-16 rounded-full"
                                />
                                <span className="max-w-24 truncate text-sm">{label}</span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
