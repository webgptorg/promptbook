'use client';

import { BookEditor } from '@promptbook-local/components';
import type { ComponentProps } from 'react';
import { useAgentsServerComponentThemes } from './useAgentsServerComponentThemes';

/**
 * BookEditor wrapper that injects the active Agents Server light/dark theme.
 *
 * @private shared helper for Agents Server routes
 */
export function ThemedBookEditor(props: ComponentProps<typeof BookEditor>) {
    const { promptbookTheme } = useAgentsServerComponentThemes();

    return <BookEditor {...props} theme={props.theme || promptbookTheme} />;
}
