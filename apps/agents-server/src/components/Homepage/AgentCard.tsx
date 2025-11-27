import Link from 'next/link';
import React from 'react';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { AvatarProfile } from '../../../../../src/book-components/AvatarProfile/AvatarProfile/AvatarProfile';
import { Card } from './Card';

type AgentCardProps = {
    agent: AgentBasicInformation;
    href: string;
};

export function AgentCard({ agent, href }: AgentCardProps) {
    return (
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
    );
}
