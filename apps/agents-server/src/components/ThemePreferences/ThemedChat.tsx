'use client';

import { Chat } from '@promptbook-local/components';
import type { ComponentProps } from 'react';
import { useAgentsServerComponentThemes } from './useAgentsServerComponentThemes';

/**
 * Chat wrapper that injects the active Agents Server light/dark theme.
 *
 * @private shared helper for Agents Server routes
 */
export function ThemedChat(props: ComponentProps<typeof Chat>) {
    const { promptbookTheme } = useAgentsServerComponentThemes();

    return <Chat {...props} theme={props.theme || promptbookTheme} />;
}
