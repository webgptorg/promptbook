import type { string_book } from '@promptbook-local/types';
import type { Dispatch, SetStateAction } from 'react';
import type { NewAgentWizardMode } from '../../constants/newAgentWizard';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { createNewAgentWizardSource } from './createNewAgentWizardSource';
import { buildWizardSourceOptions, type NewAgentWizardState } from './NewAgentWizardState';
import { trackNewAgentCreationEvent } from './trackNewAgentCreationEvent';

/**
 * Options for the extracted submission-action facade used by `useNewAgentWizard`.
 *
 * @private internal type of <useNewAgentWizard/>.
 */
type CreateNewAgentWizardSubmissionActionsOptions = {
    /**
     * Current wizard state used to synthesize the hidden book source.
     */
    readonly state: NewAgentWizardState;

    /**
     * Metadata-driven flow assignment used for analytics.
     */
    readonly mode: NewAgentWizardMode;

    /**
     * Folder scope where the flow was opened.
     */
    readonly folderId?: number | null;

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
     * Tracks whether the create request is currently in flight.
     */
    readonly setIsCreating: Dispatch<SetStateAction<boolean>>;
};

/**
 * Payload synthesized from the current wizard state before submission.
 *
 * @private internal type of <useNewAgentWizard/>.
 */
type NewAgentWizardSourcePayload = {
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
 * Builds the source payload shared by the create and open-editor actions.
 *
 * @param state - Current wizard state.
 * @returns Source payload synthesized from the state.
 */
function createNewAgentWizardSourcePayload(state: NewAgentWizardState): NewAgentWizardSourcePayload {
    const sourceOptions = buildWizardSourceOptions(state);

    return {
        agentSource: createNewAgentWizardSource(sourceOptions),
        visibility: state.visibility,
        knowledgeCount: sourceOptions.knowledgeItems.length,
    };
}

/**
 * Creates focused handlers for submission-related wizard actions.
 *
 * @param options - Action factory options.
 * @returns Small facade for create and open-editor actions.
 *
 * @private internal utility of <useNewAgentWizard/>.
 */
export function createNewAgentWizardSubmissionActions(options: CreateNewAgentWizardSubmissionActionsOptions) {
    const { state, mode, folderId, onCreate, onOpenEditor, setIsCreating } = options;

    /**
     * Switches from the guided wizard to the raw editor experience.
     */
    function handleOpenAdvancedEditor(): void {
        const { agentSource, visibility } = createNewAgentWizardSourcePayload(state);

        onOpenEditor({
            agentSource,
            visibility,
        });
    }

    /**
     * Creates the agent directly from the wizard.
     */
    async function handleCreate(): Promise<void> {
        const { agentSource, visibility, knowledgeCount } = createNewAgentWizardSourcePayload(state);

        trackNewAgentCreationEvent('new_agent_wizard_completed', {
            mode,
            surface: 'wizard',
            folderId,
            knowledgeCount,
        });

        setIsCreating(true);
        try {
            await onCreate({
                agentSource,
                visibility,
                knowledgeCount,
            });
        } finally {
            setIsCreating(false);
        }
    }

    return {
        handleOpenAdvancedEditor,
        handleCreate,
    };
}
