'use client';

import { string_book } from '@promptbook-local/types';
import { useMemo } from 'react';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { AgentProfile } from './AgentProfile';

type AgentProfileFromSourceProps = Omit<React.ComponentProps<typeof AgentProfile>, 'agent'> & {
    /**
     * Source code of the agent (book)
     */
    readonly source: string_book;
};

export function AgentProfileFromSource(props: AgentProfileFromSourceProps) {
    const { source, ...rest } = props;

    const agent = useMemo(() => {
        return parseAgentSource(source);
    }, [source]);

    return <AgentProfile agent={agent} {...rest} />;
}
