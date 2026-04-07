import { Upload } from 'lucide-react';
import type { ChangeEvent, Dispatch, KeyboardEvent, RefObject, SetStateAction } from 'react';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import type { NewAgentWizardState } from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';

/**
 * Props for the knowledge step in the new-agent wizard.
 */
type NewAgentWizardKnowledgeStepProps = {
    /**
     * Current wizard state.
     */
    readonly state: NewAgentWizardState;

    /**
     * State updater shared by the wizard.
     */
    readonly setState: Dispatch<SetStateAction<NewAgentWizardState>>;

    /**
     * Translation helper.
     */
    readonly t: NewAgentWizardTranslate;

    /**
     * File input ref used by the upload trigger.
     */
    readonly fileInputRef: RefObject<HTMLInputElement | null>;

    /**
     * Optional validation or upload feedback displayed under the URL field.
     */
    readonly knowledgeFeedback: string | null;

    /**
     * Whether the wizard is currently creating the agent.
     */
    readonly isCreating: boolean;

    /**
     * Whether any knowledge upload is still running.
     */
    readonly hasUploadingKnowledge: boolean;

    /**
     * Handles file uploads selected through the hidden input.
     */
    readonly handleKnowledgeFileSelection: (event: ChangeEvent<HTMLInputElement>) => void;

    /**
     * Handles Enter in the knowledge URL field.
     */
    readonly handleKnowledgeUrlKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;

    /**
     * Removes one knowledge item from the state.
     */
    readonly removeKnowledgeItem: (knowledgeItemId: string) => void;

    /**
     * Switches the flow to the advanced editor.
     */
    readonly handleOpenAdvancedEditor: () => void;
};

/**
 * Renders the knowledge-upload step.
 *
 * @param props - Step props.
 * @returns Knowledge step content.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function NewAgentWizardKnowledgeStep(props: NewAgentWizardKnowledgeStepProps) {
    const {
        state,
        setState,
        t,
        fileInputRef,
        knowledgeFeedback,
        isCreating,
        hasUploadingKnowledge,
        handleKnowledgeFileSelection,
        handleKnowledgeUrlKeyDown,
        removeKnowledgeItem,
        handleOpenAdvancedEditor,
    } = props;

    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-medium text-slate-900">{t('agentCreation.wizard.uploadLabel')}</div>
                        <div className="mt-1 text-sm text-slate-600">{t('agentCreation.wizard.uploadHint')}</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={NewAgentWizardClassNames.primaryButton}
                    >
                        <Upload className="h-4 w-4" />
                        {t('agentCreation.wizard.uploadAction')}
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleKnowledgeFileSelection}
                />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-800">{t('agentCreation.wizard.urlsLabel')}</label>
                <input
                    value={state.knowledgeUrlDraft}
                    onChange={(event) => setState((previous) => ({ ...previous, knowledgeUrlDraft: event.target.value }))}
                    onKeyDown={handleKnowledgeUrlKeyDown}
                    placeholder={t('agentCreation.wizard.urlsPlaceholder')}
                    className={NewAgentWizardClassNames.input}
                />
                <p className="mt-2 text-sm text-slate-500">{t('agentCreation.wizard.urlsHint')}</p>
                {knowledgeFeedback && <p className="mt-2 text-sm text-amber-700">{knowledgeFeedback}</p>}
            </div>

            <div className="space-y-2">
                {state.knowledgeItems.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        {t('agentCreation.wizard.noKnowledge')}
                    </div>
                ) : (
                    state.knowledgeItems.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-slate-900">{item.label}</div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        {item.kind === 'file' ? t('agentCreation.wizard.uploadedFile') : item.source}
                                    </div>
                                    {item.status === 'uploading' && (
                                        <div className="mt-2">
                                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-blue-500 transition-[width]"
                                                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                                                />
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {t('agentCreation.wizard.uploading', {
                                                    progress: String(Math.round(item.progress * 100)),
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {item.status === 'error' && item.errorMessage && (
                                        <div className="mt-2 text-sm text-rose-700">{item.errorMessage}</div>
                                    )}
                                </div>
                                {item.status !== 'uploading' && (
                                    <button
                                        type="button"
                                        onClick={() => removeKnowledgeItem(item.id)}
                                        className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
                                    >
                                        {t('agentCreation.wizard.removeKnowledgeAction')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button
                type="button"
                onClick={handleOpenAdvancedEditor}
                disabled={isCreating || hasUploadingKnowledge}
                className="text-sm font-medium text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {t('agentCreation.wizard.openAdvancedEditorAction')}
            </button>
        </div>
    );
}
