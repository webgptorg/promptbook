'use client';

import { useMemo } from 'react';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import { string_book } from '../../book-2.0/agent-source/string_book';
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
