'use client';

import { CustomCssEditorPanel } from './CustomCssEditorPanel';
import { CustomCssFilesPanel } from './CustomCssFilesPanel';
import { CustomCssSelectorsPanel } from './CustomCssSelectorsPanel';
import { useCustomCssClientState } from './useCustomCssClientState';

/**
 * Renders the admin custom CSS editor and saves stylesheet settings.
 *
 * @private route component of CustomCssPage
 */
export function CustomCssClient() {
    const {
        addNewFile,
        currentFile,
        deleteCurrentFile,
        downloadCurrentFile,
        error,
        files,
        handleEditorChange,
        handleScopeChange,
        hasCurrentChanges,
        isDeleting,
        isLoading,
        isSaving,
        maxLength,
        reloadFromServer,
        remainingCharacters,
        resetToTemplate,
        saveCurrentFile,
        selectFile,
        successMessage,
    } = useCustomCssClientState();

    if (isLoading) {
        return <div className="p-8 text-center">Loading custom CSS...</div>;
    }

    return (
        <div className="w-full px-2 sm:px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Custom CSS</h1>
            <p className="text-sm text-gray-600 mb-6">
                Saved stylesheets are applied in creation order on every Agents Server page. Organize rules into
                separate files to keep thematic tweaks easy to edit.
            </p>

            {error && (
                <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {successMessage}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                        <CustomCssFilesPanel
                            files={files}
                            selectedFileLocalId={currentFile?.localId ?? ''}
                            onAddNewFile={addNewFile}
                            onSelectFile={selectFile}
                        />

                        <CustomCssEditorPanel
                            currentFile={currentFile}
                            remainingCharacters={remainingCharacters}
                            maxLength={maxLength}
                            isSaving={isSaving}
                            isDeleting={isDeleting}
                            isLoading={isLoading}
                            hasCurrentChanges={hasCurrentChanges}
                            onScopeChange={handleScopeChange}
                            onEditorChange={handleEditorChange}
                            onResetToTemplate={resetToTemplate}
                            onDownloadCurrentFile={downloadCurrentFile}
                            onDeleteCurrentFile={deleteCurrentFile}
                            onReloadFromServer={reloadFromServer}
                            onSaveCurrentFile={saveCurrentFile}
                        />
                    </div>
                </section>

                <CustomCssSelectorsPanel />
            </div>
        </div>
    );
}
