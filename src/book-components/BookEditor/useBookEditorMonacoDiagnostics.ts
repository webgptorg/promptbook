import { useEffect } from 'react';
import type { editor, Monaco } from 'monaco-editor';
import { BookEditorMonacoConstants } from './BookEditorMonacoConstants';

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
    readonly monaco: Monaco | null;
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly diagnostics?: ReadonlyArray<BookEditorMonacoDiagnostic>;
};

const toMonacoMarkerSeverity = (severity: BookEditorMonacoDiagnostic['severity']) => {
    if (severity === 'warning') {
        return editor.MarkerSeverity.Warning;
    }
    if (severity === 'info') {
        return editor.MarkerSeverity.Info;
    }
    if (severity === 'hint') {
        return editor.MarkerSeverity.Hint;
    }
    return editor.MarkerSeverity.Error;
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
            severity: toMonacoMarkerSeverity(diagnostic.severity),
        }));

        monaco.editor.setModelMarkers(model, BookEditorMonacoConstants.DIAGNOSTIC_MARKER_OWNER, markers);

        return () => {
            monaco.editor.setModelMarkers(model, BookEditorMonacoConstants.DIAGNOSTIC_MARKER_OWNER, []);
        };
    }, [diagnostics, editor, monaco]);
}
