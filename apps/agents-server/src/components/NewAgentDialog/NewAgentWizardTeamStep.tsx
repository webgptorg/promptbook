import type { Dispatch, SetStateAction } from 'react';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import type { NewAgentWizardState } from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';
import { WizardChipInput } from './WizardChipInput';

/**
 * Canonical compact reference that lets the agent ask the current human for input.
 */
const USER_TEAM_REFERENCE = '{User}';

/**
 * Props for the team step in the new-agent wizard.
 */
type NewAgentWizardTeamStepProps = {
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
     * Adds the current teammate draft as one chip.
     */
    readonly addTeamReferenceFromDraft: () => void;

    /**
     * Adds one predefined teammate reference.
     */
    readonly addTeamReference: (reference: string) => void;

    /**
     * Removes one teammate chip.
     */
    readonly removeTeamReference: (teamReferenceIndex: number) => void;
};

/**
 * Renders the team-composition step.
 *
 * @param props - Step props.
 * @returns Team step content.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function NewAgentWizardTeamStep(props: NewAgentWizardTeamStepProps) {
    const { state, setState, t, addTeamReferenceFromDraft, addTeamReference, removeTeamReference } = props;

    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <WizardChipInput
                    label={t('agentCreation.wizard.teamLabel')}
                    draftValue={state.teamReferenceDraft}
                    placeholder={t('agentCreation.wizard.teamPlaceholder')}
                    chips={state.teamReferences}
                    chipVariant="emerald"
                    onDraftChange={(teamReferenceDraft) => setState((previous) => ({ ...previous, teamReferenceDraft }))}
                    onAdd={addTeamReferenceFromDraft}
                    onRemove={removeTeamReference}
                    removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
                />

                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => addTeamReference(USER_TEAM_REFERENCE)}
                        className={NewAgentWizardClassNames.secondaryButton}
                    >
                        {t('agentCreation.wizard.teamAddUserAction')}
                    </button>
                    <p className="text-sm text-slate-500">{t('agentCreation.wizard.teamHint')}</p>
                </div>
            </div>

            {state.teamReferences.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    {t('agentCreation.wizard.noTeamMembers')}
                </div>
            )}
        </div>
    );
}
