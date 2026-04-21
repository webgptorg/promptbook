import type { ChangeEvent } from 'react';
import { ThemedMonacoEditorWithShadowDom } from '../../../components/ThemePreferences/ThemedMonacoEditorWithShadowDom';
import { CUSTOM_RESOURCE_INPUT_CLASS_NAME } from '../custom-resource/shared';
import type { CustomStylesheetFileState } from './CustomStylesheetFileState';

/**
 * Props consumed by `CustomCssEditorPanel`.
 *
 * @private function of CustomCssClient
 */
type CustomCssEditorPanelProps = {
    readonly currentFile: CustomStylesheetFileState | null;
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
 * Renders the active stylesheet editor and file actions.
 *
 * @private function of CustomCssClient
 */
export function CustomCssEditorPanel({
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
}: CustomCssEditorPanelProps) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Stylesheet editor</h2>
                {currentFile?.updatedAt && (
                    <div className="text-xs text-gray-500">Last saved: {new Date(currentFile.updatedAt).toLocaleString()}</div>
                )}
            </div>

            {currentFile ? (
                <>
                    <div className="mb-3">
                        <label htmlFor="custom-css-name" className="mb-2 block text-sm font-medium text-gray-700">
                            File name
                        </label>
                        <input
                            id="custom-css-name"
                            value={currentFile.scope}
                            onChange={onScopeChange}
                            className={`${CUSTOM_RESOURCE_INPUT_CLASS_NAME} text-sm`}
                        />
                    </div>

                    <ThemedMonacoEditorWithShadowDom
                        height="520px"
                        language="css"
                        value={currentFile.css}
                        onChange={onEditorChange}
                        options={{
                            minimap: { enabled: false },
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                            wordWrap: 'on',
                            tabSize: 4,
                        }}
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className={remainingCharacters < 0 ? 'text-red-600' : 'text-gray-500'}>
                            {remainingCharacters.toLocaleString()} characters remaining
                        </span>
                        <span className="text-gray-400">Limit: {maxLength.toLocaleString()}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => void onSaveCurrentFile()}
                            disabled={isSaving || remainingCharacters < 0 || !hasCurrentChanges}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            {isSaving ? 'Saving...' : 'Save CSS'}
                        </button>
                        <button
                            type="button"
                            onClick={onResetToTemplate}
                            disabled={isSaving}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                        >
                            Reset to template
                        </button>
                        <button
                            type="button"
                            onClick={onDownloadCurrentFile}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Download file
                        </button>
                        <button
                            type="button"
                            onClick={() => void onDeleteCurrentFile()}
                            disabled={isDeleting}
                            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete file'}
                        </button>
                        <button
                            type="button"
                            onClick={() => void onReloadFromServer()}
                            disabled={isSaving || isLoading}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                        >
                            Reload from server
                        </button>
                    </div>
                </>
            ) : (
                <div className="rounded border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                    No stylesheets yet. Click New to start.
                </div>
            )}
        </div>
    );
}
