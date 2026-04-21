'use client';

import { AgentChat } from '@promptbook-local/components';
import type { ComponentProps } from 'react';
import { useAgentsServerComponentThemes } from './useAgentsServerComponentThemes';

/**
 * AgentChat wrapper that injects the active Agents Server light/dark theme.
 *
 * @private shared helper for Agents Server routes
 */
export function ThemedAgentChat(props: ComponentProps<typeof AgentChat>) {
    const { promptbookTheme } = useAgentsServerComponentThemes();

    return <AgentChat {...props} theme={props.theme || promptbookTheme} />;
}
