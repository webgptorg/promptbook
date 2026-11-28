'use client';

import { MonacoEditorWithShadowDom } from '../../../../components/_utils/MonacoEditorWithShadowDom';
import { getTranspiledCodeFileMetadata } from '../../../../utils/transpilers/getTranspiledCodeFileMetadata';
import type { Transpiler } from './Transpiler';

/**
 * Props for the generated code preview.
 *
 * @private type of `<GeneratedCodePreview/>`
 */
type GeneratedCodePreviewProps = {
    /**
     * Currently selected transpiler, used for the preview heading.
     */
    readonly selectedTranspiler: Transpiler | null;

    /**
     * Currently selected transpiler name, used to resolve the editor language.
     */
    readonly selectedTranspilerName: string;

    /**
     * Generated harness code, or an empty string when there is nothing to show yet.
     */
    readonly transpiledCode: string;

    /**
     * Whether code generation is currently in progress.
     */
    readonly isTranspiling: boolean;

    /**
     * Whether a ZIP download is currently in progress.
     */
    readonly isDownloading: boolean;
};

/**
 * Shows the generated harness code in a read-only Monaco editor, plus generation/download status.
 *
 * @private internal component of `<AgentCodePageClient/>`
 */
export function GeneratedCodePreview({
    selectedTranspiler,
    selectedTranspilerName,
    transpiledCode,
    isTranspiling,
    isDownloading,
}: GeneratedCodePreviewProps) {
    const statusLabel = getGeneratedCodeStatusLabel(isTranspiling, isDownloading);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedTranspiler?.title || 'Generated code'}
                </h3>
                {statusLabel ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
                        {statusLabel}
                    </div>
                ) : null}
            </div>

            <div className="p-4">
                {transpiledCode ? (
                    <div className="h-[32rem] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <MonacoEditorWithShadowDom
                            value={transpiledCode}
                            language={getTranspiledCodeFileMetadata(selectedTranspilerName).language}
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                wordWrap: 'on',
                            }}
                            loading={
                                <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
                                    Loading editor...
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                        {getGeneratedCodePlaceholderText(isTranspiling, selectedTranspilerName)}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Resolves the status label shown in the preview header while generating or downloading.
 *
 * @param isTranspiling - Whether code generation is in progress.
 * @param isDownloading - Whether a ZIP download is in progress.
 * @returns Status label, or `null` when neither action is running.
 *
 * @private function of `<GeneratedCodePreview/>`
 */
function getGeneratedCodeStatusLabel(isTranspiling: boolean, isDownloading: boolean): string | null {
    if (isDownloading) {
        return 'Preparing ZIP archive...';
    }

    if (isTranspiling) {
        return 'Generating code...';
    }

    return null;
}

/**
 * Resolves the placeholder text shown when there is no generated code yet.
 *
 * @param isTranspiling - Whether code generation is in progress.
 * @param selectedTranspilerName - Currently selected transpiler name.
 * @returns Placeholder text describing the current empty state.
 *
 * @private function of `<GeneratedCodePreview/>`
 */
function getGeneratedCodePlaceholderText(isTranspiling: boolean, selectedTranspilerName: string): string {
    if (isTranspiling) {
        return 'Generating code...';
    }

    if (selectedTranspilerName) {
        return 'Generated code will appear here.';
    }

    return 'Select a transpiler to generate code.';
}
