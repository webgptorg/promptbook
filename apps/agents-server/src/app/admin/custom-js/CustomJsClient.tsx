'use client';

import { CustomJsAnalyticsPanel } from './CustomJsAnalyticsPanel';
import { CustomJsEditorPanel } from './CustomJsEditorPanel';
import { CustomJsFilesPanel } from './CustomJsFilesPanel';
import { useCustomJsClientState } from './useCustomJsClientState';

/**
 * Renders the admin custom JavaScript editor and saves global script settings.
 *
 * @private route component of CustomJsPage
 */
export function CustomJsClient() {
    const {
        addNewFile,
        analyticsHasChanges,
        analyticsLoadError,
        analyticsSettings,
        analyticsStatus,
        currentFile,
        deleteCurrentFile,
        downloadCurrentFile,
        error,
        files,
        handleEditorChange,
        handleScopeChange,
        hasCurrentChanges,
        isAnalyticsLoading,
        isAnalyticsSaving,
        isDeleting,
        isLoading,
        isSaving,
        loadAnalyticsSettings,
        maxLength,
        reloadFromServer,
        remainingCharacters,
        resetToTemplate,
        saveAnalyticsSettings,
        saveCurrentFile,
        selectFile,
        successMessage,
        updateAnalyticsSettings,
    } = useCustomJsClientState();

    if (isLoading) {
        return <div className="p-8 text-center">Loading custom JavaScript...</div>;
    }

    return (
        <div className="w-full px-2 sm:px-4 md:px-8 py-8 max-w-screen-xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Custom JavaScript</h1>
            <p className="text-sm text-gray-600 mb-6">
                Scripts entered here are concatenated and injected on every Agents Server page. Use them to add helpers,
                integrations, or instrumentation, but keep them lean since runtime errors can impact the UI.
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

            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <CustomJsFilesPanel
                    files={files}
                    selectedFileLocalId={currentFile?.localId ?? ''}
                    onAddNewFile={addNewFile}
                    onSelectFile={selectFile}
                />

                <CustomJsEditorPanel
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

            <CustomJsAnalyticsPanel
                analyticsHasChanges={analyticsHasChanges}
                analyticsLoadError={analyticsLoadError}
                analyticsSettings={analyticsSettings}
                analyticsStatus={analyticsStatus}
                isAnalyticsLoading={isAnalyticsLoading}
                isAnalyticsSaving={isAnalyticsSaving}
                onLoadAnalyticsSettings={loadAnalyticsSettings}
                onSaveAnalyticsSettings={saveAnalyticsSettings}
                onUpdateAnalyticsSettings={updateAnalyticsSettings}
            />
        </div>
    );
}
