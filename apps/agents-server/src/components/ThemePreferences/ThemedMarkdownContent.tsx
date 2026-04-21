'use client';

import { MarkdownContent } from '@promptbook-local/components';
import type { ComponentProps } from 'react';
import { useAgentsServerComponentThemes } from './useAgentsServerComponentThemes';

/**
 * MarkdownContent wrapper that injects the active Agents Server light/dark theme.
 *
 * @private shared helper for Agents Server routes
 */
export function ThemedMarkdownContent(props: ComponentProps<typeof MarkdownContent>) {
    const { promptbookTheme } = useAgentsServerComponentThemes();

    return <MarkdownContent {...props} theme={props.theme || promptbookTheme} />;
}
