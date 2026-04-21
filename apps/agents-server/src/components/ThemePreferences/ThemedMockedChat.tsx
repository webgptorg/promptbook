'use client';

import { MockedChat } from '@promptbook-local/components';
import type { ComponentProps } from 'react';
import { useAgentsServerComponentThemes } from './useAgentsServerComponentThemes';

/**
 * MockedChat wrapper that injects the active Agents Server light/dark theme.
 *
 * @private shared helper for Agents Server routes
 */
export function ThemedMockedChat(props: ComponentProps<typeof MockedChat>) {
    const { promptbookTheme } = useAgentsServerComponentThemes();

    return <MockedChat {...props} theme={props.theme || promptbookTheme} />;
}
