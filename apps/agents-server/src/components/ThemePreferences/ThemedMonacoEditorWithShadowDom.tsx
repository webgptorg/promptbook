'use client';

import type { ComponentProps } from 'react';
import { MonacoEditorWithShadowDom } from '../_utils/MonacoEditorWithShadowDom';
import { useAgentsServerComponentThemes } from './useAgentsServerComponentThemes';

/**
 * Monaco wrapper that injects the active Agents Server light/dark theme.
 *
 * @private shared helper for Agents Server routes
 */
export function ThemedMonacoEditorWithShadowDom(props: ComponentProps<typeof MonacoEditorWithShadowDom>) {
    const { monacoTheme } = useAgentsServerComponentThemes();

    return <MonacoEditorWithShadowDom {...props} theme={props.theme || monacoTheme} />;
}
