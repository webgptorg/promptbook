'use client';

import MonacoEditor, { type EditorProps } from '@monaco-editor/react';

/**
 * Shared Monaco wrapper props used in Agents Server pages.
 */
type MonacoEditorWithShadowDomProps = EditorProps;

/**
 * Renders Monaco Editor with per-instance Shadow DOM isolation enabled.
 */
export function MonacoEditorWithShadowDom(props: MonacoEditorWithShadowDomProps) {
    const { options, ...restProps } = props;

    return <MonacoEditor {...restProps} options={{ ...(options || {}), useShadowDOM: true }} />;
}
