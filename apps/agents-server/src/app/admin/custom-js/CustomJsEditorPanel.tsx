'use client';

import type { ChangeEvent } from 'react';
import { MonacoEditorWithShadowDom } from '../../../components/_utils/MonacoEditorWithShadowDom';
import { usePromptbookTheme } from '../../../components/ThemeMode/usePromptbookTheme';
import {
    CUSTOM_RESOURCE_INPUT_CLASS_NAME,
    CUSTOM_RESOURCE_PRIMARY_BUTTON_CLASS_NAME,
    CUSTOM_RESOURCE_SECONDARY_BUTTON_CLASS_NAME,
} from '../custom-resource/shared';
import type { CustomJavascriptFileState } from './CustomJavascriptFileState';

/**
 * Props consumed by `CustomJsEditorPanel`.
 *
 * @private function of CustomJsClient
 */
type CustomJsEditorPanelProps = {
    readonly currentFile: CustomJavascriptFileState | null;
    readonly remainingCharacters: number;
    readonly maxLength: number;
    readonly isSaving: boolean;
    readonly isDeleting: boolean;
    readonly isLoading: boolean;
    readonly hasCurrentChanges: boolean;
    readonly onScopeChange: (event: ChangeEvent<HTMLInputElement>) => void;
    readonly onEditorChange: (value: string | undefined) => void;
    readonly onResetToTemplate: () => void;
    readonly onDownloadCurrentFile: () => void;
    readonly onDeleteCurrentFile: () => void | Promise<void>;
    readonly onReloadFromServer: () => void | Promise<void>;
    readonly onSaveCurrentFile: () => void | Promise<void>;
};

/**
 * Renders the active custom JavaScript editor and file actions.
 *
 * @private function of CustomJsClient
 */
export function CustomJsEditorPanel({
    currentFile,
    remainingCharacters,
    maxLength,
    isSaving,
    isDeleting,
    isLoading,
    hasCurrentChanges,
    onScopeChange,
    onEditorChange,
    onResetToTemplate,
    onDownloadCurrentFile,
    onDeleteCurrentFile,
    onReloadFromServer,
    onSaveCurrentFile,
}: CustomJsEditorPanelProps) {
    const { monacoTheme } = usePromptbookTheme();

    return (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Script editor</h2>
                {currentFile?.updatedAt && (
                    <div className="text-xs text-gray-500 dark:text-slate-400">Last saved: {new Date(currentFile.updatedAt).toLocaleString()}</div>
                )}
            </div>

            {currentFile ? (
                <>
                    <div>
                        <label htmlFor="custom-js-name" className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                            File name
                        </label>
                        <input
                            id="custom-js-name"
                            value={currentFile.scope}
                            onChange={onScopeChange}
                            className={`${CUSTOM_RESOURCE_INPUT_CLASS_NAME} mb-4 text-sm`}
                        />
                    </div>

                    <MonacoEditorWithShadowDom
                        height="520px"
                        language="javascript"
                        theme={monacoTheme}
                        value={currentFile.javascript}
                        onChange={onEditorChange}
                        options={{
                            minimap: { enabled: false },
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                            wordWrap: 'on',
                            tabSize: 4,
                        }}
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className={remainingCharacters < 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-slate-400'}>
                            {remainingCharacters.toLocaleString()} characters remaining
                        </span>
                        <span className="text-gray-400 dark:text-slate-500">Limit: {maxLength.toLocaleString()}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => void onSaveCurrentFile()}
                            disabled={isSaving || remainingCharacters < 0 || !hasCurrentChanges}
                            className={CUSTOM_RESOURCE_PRIMARY_BUTTON_CLASS_NAME}
                        >
                            {isSaving ? 'Saving...' : 'Save script'}
                        </button>
                        <button
                            type="button"
                            onClick={onResetToTemplate}
                            disabled={isSaving}
                            className={CUSTOM_RESOURCE_SECONDARY_BUTTON_CLASS_NAME}
                        >
                            Reset to template
                        </button>
                        <button
                            type="button"
                            onClick={onDownloadCurrentFile}
                            className={CUSTOM_RESOURCE_SECONDARY_BUTTON_CLASS_NAME}
                        >
                            Download file
                        </button>
                        <button
                            type="button"
                            onClick={() => void onDeleteCurrentFile()}
                            disabled={isDeleting}
                            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete file'}
                        </button>
                        <button
                            type="button"
                            onClick={() => void onReloadFromServer()}
                            disabled={isSaving || isLoading}
                            className={CUSTOM_RESOURCE_SECONDARY_BUTTON_CLASS_NAME}
                        >
                            Reload from server
                        </button>
                    </div>
                </>
            ) : (
                <div className="rounded border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
                    No scripts yet. Click New file to start.
                </div>
            )}
        </section>
    );
}
