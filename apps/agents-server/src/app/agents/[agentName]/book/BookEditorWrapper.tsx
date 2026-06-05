'use client';

import { BookEditor } from '@promptbook-local/components';
import type { string_book } from '@promptbook-local/types';
import { bookEditorUploadHandler } from '../../../../utils/upload/createBookEditorUploadHandler';
import { FileUploadUnavailableNotice } from '../../../../components/FileUploadAvailability/FileUploadUnavailableNotice';
import { useFileUploadAvailability } from '../../../../components/FileUploadAvailability/FileUploadAvailabilityContext';
import { SaveFailureNotice } from '../../../../components/SaveFailureNotice/SaveFailureNotice';
import { usePromptbookTheme } from '../../../../components/ThemeMode/usePromptbookTheme';
import { BookEditorHistoryPanel } from './BookEditorHistoryPanel';
import { BookEditorMissingReferences } from './BookEditorMissingReferences';
import { useBookEditorWrapper } from './useBookEditorWrapper';

/**
 * Props for the BookEditorWrapper component.
 */
type BookEditorWrapperProps = {
    agentName: string;
    initialAgentSource: string_book;
};

// TODO: [🐱‍🚀] Rename to BookEditorSavingWrapper

/**
 * Wraps the BookEditor with autosave and file upload support.
 */
export function BookEditorWrapper({ agentName, initialAgentSource }: BookEditorWrapperProps) {
    const { promptbookTheme } = usePromptbookTheme();
    const fileUploadAvailability = useFileUploadAvailability();
    const {
        agentSource,
        monacoModelPath,
        diagnostics,
        saveStatus,
        saveErrorMessage,
        retrySaveNow,
        handleChange,
        hoistedMenuItems,
        missingAgentReferences,
        creatingReference,
        handleCreateReferencedAgent,
        historyPanelProps,
    } = useBookEditorWrapper({ agentName, initialAgentSource });

    return (
        <div className="relative flex h-full min-h-0 flex-col">
            {saveStatus === 'error' && (
                <SaveFailureNotice
                    className="mb-3"
                    message={saveErrorMessage || 'Book save failed. Retry to persist the current source.'}
                    onRetry={retrySaveNow}
                />
            )}
            {!fileUploadAvailability.isUploadAvailable && <FileUploadUnavailableNotice className="mb-3" />}

            <div className="flex min-h-0 flex-1 gap-4">
                <div className="flex min-h-0 min-w-0 flex-1 gap-6">
                    <div className="min-h-0 min-w-0 flex-1">
                        <BookEditor
                            className="h-full w-full"
                            isBorderRadiusDisabled
                            height={null}
                            value={agentSource}
                            monacoModelPath={monacoModelPath}
                            onChange={handleChange}
                            onFileUpload={
                                fileUploadAvailability.isUploadAvailable ? bookEditorUploadHandler : undefined
                            }
                            diagnostics={diagnostics}
                            hoistedMenuItems={hoistedMenuItems}
                            theme={promptbookTheme}
                        />
                    </div>

                    <BookEditorMissingReferences
                        className="hidden w-80 shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/85 dark:shadow-slate-950/30 xl:flex"
                        missingAgentReferences={missingAgentReferences}
                        creatingReference={creatingReference}
                        onCreateReferencedAgent={handleCreateReferencedAgent}
                    />
                </div>

                <BookEditorHistoryPanel {...historyPanelProps} theme={promptbookTheme} />
            </div>

            <BookEditorMissingReferences
                className="mt-4 flex flex-col gap-4 px-4 xl:hidden"
                missingAgentReferences={missingAgentReferences}
                creatingReference={creatingReference}
                onCreateReferencedAgent={handleCreateReferencedAgent}
            />
        </div>
    );
}
