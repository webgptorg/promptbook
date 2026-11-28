'use client';

import { string_book } from '@promptbook-local/types';
import { X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { BookEditor } from '../../../../../src/book-components/BookEditor/BookEditor';
import { bookEditorUploadHandler } from '../../utils/upload/createBookEditorUploadHandler';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { FileUploadUnavailableNotice } from '../FileUploadAvailability/FileUploadUnavailableNotice';
import { useFileUploadAvailability } from '../FileUploadAvailability/FileUploadAvailabilityContext';
import { Dialog } from '../Portal/Dialog';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { usePromptbookTheme } from '../ThemeMode/usePromptbookTheme';
import { useDirtyModalGuard } from '../utils/useDirtyModalGuard';

/**
 * Props for the NewAgentDialog component.
 */
type NewAgentDialogProps = {
    onClose: () => void;
    initialAgentSource: string_book;
    onCreate: (agentSource: string_book) => Promise<void>;
};

/**
 * Renders the create-agent dialog with a BookEditor and upload support.
 */
export function NewAgentDialog(props: NewAgentDialogProps) {
    const { onClose, initialAgentSource, onCreate } = props;
    const [agentSource, setAgentSource] = useState(initialAgentSource);
    const [isCreating, setIsCreating] = useState(false);
    const { formatText } = useAgentNaming();
    const { t } = useServerLanguage();
    const fileUploadAvailability = useFileUploadAvailability();
    const { promptbookTheme } = usePromptbookTheme();
    const { requestClose } = useDirtyModalGuard({
        hasUnsavedChanges: agentSource !== initialAgentSource,
        onClose,
    });
    // [✨🧬] const [isInteracted, setIsInteracted] = useState(false);

    /*
    [✨🧬]
    useEffect(() => {
        setAgentSource(initialAgentSource);
        setIsInteracted(false);
    }, [initialAgentSource, isOpen]);
    */

    /**
     * Creates the agent and manages the dialog loading state.
     */
    const handleCreate = async () => {
        setIsCreating(true);
        try {
            await onCreate(agentSource);
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = useCallback(() => {
        requestClose();
    }, [requestClose]);

    return (
        <Dialog
            onClose={handleClose}
            className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden"
        >
            <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/95">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                    {formatText(t('agentCreation.dialogTitle'))}
                </h2>
                <button
                    onClick={handleClose}
                    className="text-gray-400 transition-colors hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-200"
                >
                    <X className="w-5 h-5" />
                    <span className="sr-only">{t('common.close')}</span>
                </button>
            </div>

            <div
                className="relative flex flex-1 flex-col overflow-hidden bg-slate-50/60 p-4 dark:bg-slate-950/55" /* [✨🧬] onDragEnter={() => setIsInteracted(true)} */
            >
                {!fileUploadAvailability.isUploadAvailable && <FileUploadUnavailableNotice className="mb-3" />}
                <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 shadow-inner dark:border-slate-800/80">
                    <BookEditor
                        className="h-full w-full"
                        agentSource={agentSource}
                        onChange={(source) => {
                            setAgentSource(source);
                            // [✨🧬] setIsInteracted(true);
                        }}
                        height="100%"
                        isBorderRadiusDisabled
                        isVerbose={false}
                        onFileUpload={fileUploadAvailability.isUploadAvailable ? bookEditorUploadHandler : undefined}
                        theme={promptbookTheme}
                    />
                </div>

                {/* TODO: [✨🧬] When creating new agent, show the floating hint
                {!isInteracted && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none select-none flex items-center pr-4 md:pr-12">
                        <div className="relative">
                            <svg
                                width="150"
                                height="100"
                                viewBox="0 0 150 100"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="text-red-500 transform -rotate-12 w-24 h-16 md:w-32 md:h-24"
                            >
                                <path
                                    d="M140 10C120 20 80 30 40 60M40 60L55 55M40 60L50 75"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-red-500 font-medium text-lg md:text-xl whitespace-nowrap text-center leading-tight">
                                Drop the files
                                <br />
                                with the knowledge here
                            </div>
                        </div>
                    </div>
                )}
                */}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950/95">
                <button
                    onClick={handleClose}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    {t('common.cancel')}
                </button>
                <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isCreating ? (
                        <>
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            {t('agentCreation.dialogCreating')}
                        </>
                    ) : (
                        formatText(t('agentCreation.dialogCreateAction'))
                    )}
                </button>
            </div>
        </Dialog>
    );
}
