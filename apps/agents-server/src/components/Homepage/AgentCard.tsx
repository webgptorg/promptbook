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
};

export function AgentCard({ agent, href, isAdmin, onDelete }: AgentCardProps) {
    return (
        <div style={{ position: 'relative' }}>
            <Link href={href}>
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
                <button
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        zIndex: 2,
                    }}
                    onClick={() => onDelete?.(agent.agentName)}
                    title="Delete agent"
                >
                    Delete
                </button>
            )}
        </div>
    );
}
