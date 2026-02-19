import type { editor, MarkerSeverity } from 'monaco-editor';
import { useEffect } from 'react';
import { BookEditorMonacoConstants } from './BookEditorMonacoConstants';

type MonacoEditor = typeof import('monaco-editor');

type BookEditorMonacoDiagnostic = {
    readonly startLineNumber: number;
    readonly startColumn: number;
    readonly endLineNumber: number;
    readonly endColumn: number;
    readonly message: string;
    readonly source?: string;
    readonly severity?: 'error' | 'warning' | 'info' | 'hint';
};

type UseBookEditorMonacoDiagnosticsProps = {
    readonly monaco: MonacoEditor | null;
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly diagnostics?: ReadonlyArray<BookEditorMonacoDiagnostic>;
};

const toMonacoMarkerSeverity = (
    monaco: MonacoEditor,
    severity: BookEditorMonacoDiagnostic['severity'],
): MarkerSeverity => {
    if (severity === 'warning') {
        return monaco.MarkerSeverity.Warning;
    }
    if (severity === 'info') {
        return monaco.MarkerSeverity.Info;
    }
    if (severity === 'hint') {
        return monaco.MarkerSeverity.Hint;
    }
    return monaco.MarkerSeverity.Error;
};

/**
 * Synchronizes Monaco markers with the diagnostics provided to `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoDiagnostics({ editor, monaco, diagnostics }: UseBookEditorMonacoDiagnosticsProps) {
    useEffect(() => {
        if (!editor || !monaco) {
            return;
        }

        const model = editor.getModel();
        if (!model) {
            return;
        }

        const markers: editor.IMarkerData[] = (diagnostics || []).map((diagnostic) => ({
            startLineNumber: diagnostic.startLineNumber,
            startColumn: diagnostic.startColumn,
            endLineNumber: diagnostic.endLineNumber,
            endColumn: diagnostic.endColumn,
            message: diagnostic.message,
            source: diagnostic.source,
            severity: toMonacoMarkerSeverity(monaco, diagnostic.severity),
        }));

        monaco.editor.setModelMarkers(model, BookEditorMonacoConstants.DIAGNOSTIC_MARKER_OWNER, markers);

        return () => {
            monaco.editor.setModelMarkers(model, BookEditorMonacoConstants.DIAGNOSTIC_MARKER_OWNER, []);
        };
    }, [diagnostics, editor, monaco]);
}
