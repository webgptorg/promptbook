'use client';

import MonacoEditor, { type EditorProps } from '@monaco-editor/react';

/**
 * Shared Monaco wrapper props.
 *
 * @private Internal utility for book components and Agents Server.
 */
type MonacoEditorWithShadowDomProps = EditorProps;

/**
 * Renders Monaco Editor with per-instance Shadow DOM isolation enabled.
 *
 * This keeps Monaco instances encapsulated from each other while preserving
 * the same external API as `@monaco-editor/react`.
 *
 * @private Internal utility for book components and Agents Server.
 */
export function MonacoEditorWithShadowDom(props: MonacoEditorWithShadowDomProps) {
    const { options, ...restProps } = props;

    return <MonacoEditor {...restProps} options={{ ...(options || {}), useShadowDOM: true }} />;
}
