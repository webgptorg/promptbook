'use client';

import type { string_book } from '@promptbook-local/types';
import { ArrowLeft, ArrowRight, BookOpen, X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import type { NewAgentWizardMode } from '../../constants/newAgentWizard';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { Dialog } from '../Portal/Dialog';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { NewAgentWizardBasicStep } from './NewAgentWizardBasicStep';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import { NewAgentWizardKnowledgeStep } from './NewAgentWizardKnowledgeStep';
import { NewAgentWizardPersonaStep } from './NewAgentWizardPersonaStep';
import { NewAgentWizardRulesStep } from './NewAgentWizardRulesStep';
import { NewAgentWizardTeamStep } from './NewAgentWizardTeamStep';
import { NewAgentWizardUseSetupStep } from './NewAgentWizardUseSetupStep';
import { NewAgentWizardWritingStep } from './NewAgentWizardWritingStep';
import { useNewAgentWizard } from './useNewAgentWizard';

/**
 * Props accepted by the guided new-agent wizard.
 */
type NewAgentWizardProps = {
    /**
     * Metadata-driven flow assignment used for analytics.
     */
    readonly mode: NewAgentWizardMode;

    /**
     * Default visibility resolved from server metadata.
     */
    readonly defaultVisibility: AgentVisibility;

    /**
     * Boilerplate agent name generated through the existing name pool mechanism.
     */
    readonly initialAgentName?: string;

    /**
     * Folder scope where the flow was opened.
     */
    readonly folderId?: number | null;

    /**
     * Requests closing the wizard dialog.
     */
    readonly onClose: () => void;

    /**
     * Persists the synthesized agent source using the existing create-agent endpoint.
     */
    readonly onCreate: (request: NewAgentWizardCreateRequest) => Promise<void>;

    /**
     * Switches from the wizard to the advanced raw editor before creation.
     */
    readonly onOpenEditor: (request: NewAgentWizardOpenEditorRequest) => void;
};

/**
 * Payload submitted when the wizard creates an agent directly.
 */
export type NewAgentWizardCreateRequest = {
    /**
     * Hidden book source synthesized from the wizard form.
     */
    readonly agentSource: string_book;

    /**
     * Explicit visibility choice selected in the wizard.
     */
    readonly visibility: AgentVisibility;

    /**
     * Number of ready knowledge sources included in the final source.
     */
    readonly knowledgeCount: number;
};

/**
 * Payload used when the user switches from the wizard to the advanced editor.
 */
export type NewAgentWizardOpenEditorRequest = {
    /**
     * Hidden book source synthesized from the wizard form.
     */
    readonly agentSource: string_book;

    /**
     * Explicit visibility choice selected in the wizard.
     */
    readonly visibility: AgentVisibility;
};

/**
 * Renders the current wizard step content.
 *
 * @param props - Step rendering props.
 * @returns Current step body.
 */
function renderStepContent(props: {
    readonly stepId: string;
    readonly wizard: ReturnType<typeof useNewAgentWizard>;
    readonly t: ReturnType<typeof useServerLanguage>['t'];
}): ReactNode {
    const { stepId, wizard, t } = props;
    const { state, setState, togglePresetSelection, addDraftChip, removeDraftChip } = wizard;

    switch (stepId) {
        case 'basic':
            return <NewAgentWizardBasicStep state={state} setState={setState} t={t} />;
        case 'persona':
            return (
                <NewAgentWizardPersonaStep
                    state={state}
                    setState={setState}
                    t={t}
                    togglePresetSelection={togglePresetSelection}
                    addDraftChip={addDraftChip}
                    removeDraftChip={removeDraftChip}
                />
            );
        case 'use-setup':
            return <NewAgentWizardUseSetupStep state={state} setState={setState} t={t} />;
        case 'team':
            return (
                <NewAgentWizardTeamStep
                    state={state}
                    t={t}
                    toggleTeamReference={wizard.toggleTeamReference}
                />
            );
        case 'writing':
            return (
                <NewAgentWizardWritingStep
                    state={state}
                    setState={setState}
                    t={t}
                    togglePresetSelection={togglePresetSelection}
                    addDraftChip={addDraftChip}
                    removeDraftChip={removeDraftChip}
                />
            );
        case 'rules':
            return (
                <NewAgentWizardRulesStep
                    state={state}
                    setState={setState}
                    t={t}
                    togglePresetSelection={togglePresetSelection}
                    addDraftChip={addDraftChip}
                    removeDraftChip={removeDraftChip}
                />
            );
        case 'knowledge':
            return (
                <NewAgentWizardKnowledgeStep
                    state={state}
                    setState={setState}
                    t={t}
                    fileInputRef={wizard.fileInputRef}
                    knowledgeFeedback={wizard.knowledgeFeedback}
                    handleKnowledgeFileSelection={wizard.handleKnowledgeFileSelection}
                    handleKnowledgeUrlKeyDown={wizard.handleKnowledgeUrlKeyDown}
                    removeKnowledgeItem={wizard.removeKnowledgeItem}
                />
            );
        default:
            return null;
    }
}

/**
 * Renders the guided multi-step new-agent creation flow.
 *
 * @param props - Wizard props.
 * @returns Guided new-agent wizard dialog.
 */
export function NewAgentWizard(props: NewAgentWizardProps) {
    const { mode, defaultVisibility, initialAgentName, folderId, onClose, onCreate, onOpenEditor } = props;
    const { formatText } = useAgentNaming();
    const { t } = useServerLanguage();
    const titleId = useId();
    const descriptionId = useId();
    const wizard = useNewAgentWizard({
        mode,
        defaultVisibility,
        initialAgentName,
        folderId,
        onClose,
        onCreate,
        onOpenEditor,
        t,
    });
    const currentStepDefinition = wizard.stepDefinitions[wizard.step] || wizard.stepDefinitions[0];
    const currentStepTitle = t(currentStepDefinition.titleKey);
    const currentStepDescription = t(currentStepDefinition.descriptionKey);
    const isLastStep = wizard.step === wizard.stepDefinitions.length - 1;
    const isOpenBookEditorDisabled = wizard.isCreating || wizard.hasUploadingKnowledge;

    return (
        <Dialog
            onClose={wizard.requestClose}
            className="w-[min(96vw,60rem)]"
            ariaLabelledBy={titleId}
            ariaDescribedBy={descriptionId}
        >
            <div
                className="relative flex h-[min(92vh,52rem)] flex-col overflow-hidden"
                onDragEnter={wizard.handleDialogDragEnter}
                onDragOver={wizard.handleDialogDragOver}
                onDragLeave={wizard.handleDialogDragLeave}
                onDrop={wizard.handleDialogDrop}
            >
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                {t('agentCreation.wizardEyebrow')}
                            </div>
                            <h2 id={titleId} className="mt-1 text-xl font-semibold text-slate-900">
                                {formatText(t('agentCreation.wizardTitle'))}
                            </h2>
                            <p id={descriptionId} className="mt-1 text-sm text-slate-600">
                                {currentStepDescription}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={wizard.handleOpenAdvancedEditor}
                                disabled={isOpenBookEditorDisabled}
                                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <BookOpen className="h-4 w-4" />
                                {t('agentCreation.wizard.openAdvancedEditorAction')}
                            </button>
                            <button
                                type="button"
                                onClick={wizard.requestClose}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                                <span className="sr-only">{t('common.close')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {wizard.stepDefinitions.map((stepDefinition, stepIndex) => (
                            <button
                                key={stepDefinition.id}
                                type="button"
                                onClick={() => wizard.setStep(stepIndex)}
                                disabled={wizard.isCreating}
                                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                    stepIndex === wizard.step
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                }`}
                            >
                                {stepIndex + 1}. {t(stepDefinition.shortKey)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
                    <div className="mx-auto max-w-4xl">
                        <h3 className="text-lg font-semibold text-slate-900">{currentStepTitle}</h3>
                        {renderStepContent({
                            stepId: currentStepDefinition.id,
                            wizard,
                            t,
                        })}
                    </div>
                </div>

                <div className="border-t border-slate-200 bg-white px-5 py-3">
                    <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={wizard.step === 0 ? wizard.requestClose : wizard.handleBack}
                            disabled={wizard.isCreating}
                            className={NewAgentWizardClassNames.secondaryButton}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {wizard.step === 0 ? t('common.cancel') : t('agentCreation.wizard.backAction')}
                        </button>

                        {!isLastStep ? (
                            <button
                                type="button"
                                onClick={wizard.handleNext}
                                disabled={wizard.isCreating}
                                className={NewAgentWizardClassNames.primaryButton}
                            >
                                {t('agentCreation.wizard.nextAction')}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void wizard.handleCreate()}
                                disabled={
                                    wizard.isCreating || wizard.hasUploadingKnowledge || wizard.state.name.trim() === ''
                                }
                                className={NewAgentWizardClassNames.primaryButton}
                            >
                                {wizard.isCreating
                                    ? t('agentCreation.wizard.creatingAction')
                                    : t('agentCreation.wizard.createAction')}
                            </button>
                        )}
                    </div>
                </div>

                {wizard.isDragOverDialog && (
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-blue-50/80">
                        <div className="rounded-xl border border-blue-300 bg-white px-5 py-4 text-center">
                            <div className="text-sm font-semibold text-blue-900">
                                {t('agentCreation.wizard.uploadLabel')}
                            </div>
                            <div className="mt-1 text-sm text-blue-700">{t('agentCreation.wizard.uploadHint')}</div>
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    );
}
