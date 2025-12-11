'use client';

import { CSSProperties } from 'react';
import type { AgentBasicInformation } from '../../book-2.0/agent-source/AgentBasicInformation';
import { string_css_class } from '../../types/typeAliases';
import { just } from '../../utils/organization/just';
import { PromptbookAgentSeamlessIntegration } from './PromptbookAgentSeamlessIntegration';

/**
 * @private props of PromptbookAgentIntegration component
 */
export type PromptbookAgentIntegrationProps = {
    /**
     * URL of the agent to connect to
     *
     * @example "http://s6.ptbk.io/benjamin-white"
     */
    readonly agentUrl: string;

    /**
     * Form of the agent integration
     *
     * @default `seamless`
     *
     * - `seamless` Default, current behavior
     * - `book` Show the Agent as a book in BookEditor
     * - `chat` Show the Agent as a chat which is not floating but as AgentChat component
     * - `profile` Show the Agent as a profile using
     */
    readonly formfactor?: 'seamless' | 'book' | 'chat' | 'profile';

    /**
     * Optional metadata to show before the agent is connected
     * Or to override the agent metadata if the agent does not provide it
     */
    readonly meta?: Partial<AgentBasicInformation['meta']>;

    /**
     * Callback when the window is opened or closed
     */
    onOpenChange?(isOpen: boolean): void;

    /**
     * Optional CSS class name which will be added to root element
     */
    readonly className?: string_css_class;

    /**
     * Optional CSS style which will be added to root element
     */
    readonly style?: CSSProperties;

    /**
     * Is the writing textarea automatically focused?
     *
     * @default false (to prevent focus being stolen when widget loads)
     */
    readonly isFocusedOnLoad?: boolean;
};

/**
 * Renders a floating agent button that opens a chat window with the remote agent.
 *
 * @public exported from `@promptbook/components`
 */
export function PromptbookAgentIntegration(props: PromptbookAgentIntegrationProps) {
    const { agentUrl, formfactor = 'seamless', meta, onOpenChange, className, style, isFocusedOnLoad = false } = props;

    if (just(false)) {
        /* IGNORE */
    } else if (formfactor === 'seamless') {
        return (
            <PromptbookAgentSeamlessIntegration
                {...{ agentUrl, meta, onOpenChange, className, style, isFocusedOnLoad }}
            />
        );
    } else if (formfactor === 'book') {
        return <iframe src={agentUrl + '/book?headless'} className={className} style={style} tabIndex={-1} />;
    } else if (formfactor === 'chat') {
        return <iframe src={agentUrl + '/chat?headless'} className={className} style={style} tabIndex={-1} />;
    } else if (formfactor === 'profile') {
        return <iframe src={agentUrl + '?headless'} className={className} style={style} tabIndex={-1} />;
    } else {
        throw new Error(`PromptbookAgentIntegration: Unsupported formfactor "${formfactor}"`);
    }
}

/**
 * TODO: !!! Load the full branding
 * TODO: !!! <promptbook-agent> element
 */
