'use client';

import { useState } from 'react';
import { Actor } from './actions';

type AgentPaletteProps = {
    onAddActor: (agent: Actor) => void;
};

export function AgentPalette({ onAddActor }: AgentPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localAgents] = useState<Actor[]>([
        { name: 'Rabbit' },
        { name: 'Fox' },
        { name: 'Bear' },
    ]);
    // TODO: Fetch remote and ad-hoc agents

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 bg-gray-200 rounded"
            >
                Add Actor
            </button>
            {isOpen && (
                <div className="absolute bottom-full mb-2 w-64 bg-white rounded-md shadow-lg border p-4">
                    <h4 className="font-bold mb-2">Local Agents</h4>
                    <ul>
                        {localAgents.map((agent) => (
                            <li key={agent.name}>
                                <button
                                    onClick={() => {
                                        onAddActor(agent);
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left p-2 hover:bg-gray-100"
                                >
                                    {agent.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
