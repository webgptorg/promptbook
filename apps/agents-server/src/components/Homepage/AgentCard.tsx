import Link from 'next/link';
import React from 'react';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { AvatarProfile } from '../../../../../src/book-components/AvatarProfile/AvatarProfile/AvatarProfile';
import { Card } from './Card';

type AgentCardProps = {
    agent: AgentBasicInformation;
    href: string;
    isAdmin?: boolean;
    onDelete?: (agentName: string) => void;
    onClone?: (agentName: string) => void;
};

const ACTION_BUTTON_CLASSES =
    'text-white px-3 py-1 rounded shadow text-xs font-medium transition-colors uppercase tracking-wider opacity-80 hover:opacity-100';

export function AgentCard({ agent, href, isAdmin, onDelete, onClone }: AgentCardProps) {
    return (
        <div className="relative h-full group">
            <Link href={href} className="block h-full">
                <Card
                    style={
                        !agent.meta.color
                            ? {}
                            : {
                                  backgroundColor: `${agent.meta.color}22`,
                              }
                    }
                >
                    <AvatarProfile agent={agent} />
                </Card>
            </Link>
            {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        className={`bg-blue-500 hover:bg-blue-600 ${ACTION_BUTTON_CLASSES}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onClone?.(agent.agentName);
                        }}
                        title="Clone agent"
                    >
                        Clone
                    </button>
                    <button
                        className={`bg-red-500 hover:bg-red-600 ${ACTION_BUTTON_CLASSES}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onDelete?.(agent.agentName);
                        }}
                        title="Delete agent"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}
