'use client';

import type { string_book } from '@promptbook-local/types';
import { useMemo, useState } from 'react';
import type { NewAgentWizardMode } from '../../constants/newAgentWizard';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { useDirtyModalGuard } from '../utils/useDirtyModalGuard';
import { createNewAgentWizardFormActions } from './createNewAgentWizardFormActions';
import { createNewAgentWizardSubmissionActions } from './createNewAgentWizardSubmissionActions';
import { NEW_AGENT_WIZARD_STEP_DEFINITIONS } from './newAgentWizardPresets';
import { createInitialWizardState, hasWizardChanges, type NewAgentWizardState } from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';
import { useNewAgentWizardKnowledgeState } from './useNewAgentWizardKnowledgeState';

/**
 * Options for the extracted new-agent wizard state hook.
 */
type UseNewAgentWizardOptions = {
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
    readonly onCreate: (request: {
        readonly agentSource: string_book;
        readonly visibility: AgentVisibility;
        readonly knowledgeCount: number;
    }) => Promise<void>;

    /**
     * Switches from the wizard to the advanced raw editor before creation.
     */
    readonly onOpenEditor: (request: {
        readonly agentSource: string_book;
        readonly visibility: AgentVisibility;
    }) => void;

    /**
     * Translation helper.
     */
    readonly t: NewAgentWizardTranslate;
};

/**
 * Encapsulates the wizard state machine and composes focused interaction helpers.
 *
 * @param options - Hook options.
 * @returns Stateful wizard data and event handlers.
 *
 * @private internal hook of <NewAgentWizard/>.
 */
export function useNewAgentWizard(options: UseNewAgentWizardOptions) {
    const { mode, defaultVisibility, initialAgentName, folderId, onClose, onCreate, onOpenEditor, t } = options;
    const initialState = useMemo(
        () => createInitialWizardState(defaultVisibility, initialAgentName),
        [defaultVisibility, initialAgentName],
    );
    const [state, setState] = useState<NewAgentWizardState>(initialState);
    const [step, setStep] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const hasUnsavedChanges = hasWizardChanges(state, initialState);
    const { requestClose } = useDirtyModalGuard({
        hasUnsavedChanges,
        isCloseBlocked: isCreating,
        onClose,
    });
    const knowledgeState = useNewAgentWizardKnowledgeState({
        state,
        setState,
        setStep,
        t,
    });
    const formActions = createNewAgentWizardFormActions({ setState });
    const submissionActions = createNewAgentWizardSubmissionActions({
        state,
        mode,
        folderId,
        onCreate,
        onOpenEditor,
        setIsCreating,
    });

    /**
     * Moves the wizard one step forward.
     */
    function handleNext(): void {
        setStep((previous) => Math.min(previous + 1, NEW_AGENT_WIZARD_STEP_DEFINITIONS.length - 1));
    }

    /**
     * Moves the wizard back by one step.
     */
    function handleBack(): void {
        setStep((previous) => Math.max(previous - 1, 0));
    }

    return {
        state,
        setState,
        step,
        setStep,
        isCreating,
        hasUnsavedChanges,
        requestClose,
        ...formActions,
        ...knowledgeState,
        handleNext,
        handleBack,
        ...submissionActions,
    };
}
