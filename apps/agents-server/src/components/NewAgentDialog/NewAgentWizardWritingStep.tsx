import type { Dispatch, SetStateAction } from 'react';
import { NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS } from './newAgentWizardPresets';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import type {
    NewAgentWizardChipCollectionKey,
    NewAgentWizardChipDraftKey,
    NewAgentWizardPresetSelectionKey,
    NewAgentWizardState,
} from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';
import { WizardChipInput } from './WizardChipInput';
import { WizardSelectableCard } from './WizardSelectableCard';
import { WritingSamplePreview } from './WritingSamplePreview';

/**
 * Props for the writing-style step in the new-agent wizard.
 */
type NewAgentWizardWritingStepProps = {
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
     * Toggles one preset selection list.
     */
    readonly togglePresetSelection: (key: NewAgentWizardPresetSelectionKey, presetId: string) => void;

    /**
     * Adds the current draft input into a chip list.
     */
    readonly addDraftChip: (chipsKey: NewAgentWizardChipCollectionKey, draftKey: NewAgentWizardChipDraftKey) => void;

    /**
     * Removes one chip from a chip list.
     */
    readonly removeDraftChip: (chipsKey: NewAgentWizardChipCollectionKey, chipIndex: number) => void;
};

/**
 * Renders the writing-style step.
 *
 * @param props - Step props.
 * @returns Writing-style step content.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function NewAgentWizardWritingStep(props: NewAgentWizardWritingStepProps) {
    const { state, setState, t, togglePresetSelection, addDraftChip, removeDraftChip } = props;
    const writingPreviewUserMessage = t('agentCreation.wizard.writingPreviewUserMessage');

    return (
        <div className="mt-4 space-y-6 rounded-xl border border-slate-200 bg-white p-4">
            <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                    {t('agentCreation.wizard.writingStylesLabel')}
                </label>
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS.map((preset) => (
                        <WizardSelectableCard
                            key={preset.id}
                            icon={preset.icon}
                            label={t(preset.labelKey)}
                            isSelected={state.selectedWritingStyleIds.includes(preset.id)}
                            onClick={() => togglePresetSelection('selectedWritingStyleIds', preset.id)}
                        >
                            <WritingSamplePreview
                                assistantMessage={preset.writingSample}
                                userMessage={writingPreviewUserMessage}
                            />
                        </WizardSelectableCard>
                    ))}
                </div>
            </div>

            <WizardChipInput
                label={t('agentCreation.wizard.customWritingTraitLabel')}
                draftValue={state.customWritingTraitDraft}
                placeholder={t('agentCreation.wizard.customWritingTraitPlaceholder')}
                chips={state.customWritingTraits}
                chipVariant="blue"
                onDraftChange={(customWritingTraitDraft) => setState((previous) => ({ ...previous, customWritingTraitDraft }))}
                onAdd={() => addDraftChip('customWritingTraits', 'customWritingTraitDraft')}
                onRemove={(chipIndex) => removeDraftChip('customWritingTraits', chipIndex)}
                removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
            />

            <WizardChipInput
                label={t('agentCreation.wizard.customWritingRuleLabel')}
                draftValue={state.customWritingRuleDraft}
                placeholder={t('agentCreation.wizard.customWritingRulePlaceholder')}
                chips={state.customWritingRules}
                chipVariant="amber"
                onDraftChange={(customWritingRuleDraft) => setState((previous) => ({ ...previous, customWritingRuleDraft }))}
                onAdd={() => addDraftChip('customWritingRules', 'customWritingRuleDraft')}
                onRemove={(chipIndex) => removeDraftChip('customWritingRules', chipIndex)}
                removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
            />

            <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">
                    {t('agentCreation.wizard.customWritingSampleLabel')}
                </label>
                <textarea
                    value={state.customWritingSample}
                    onChange={(event) =>
                        setState((previous) => ({
                            ...previous,
                            customWritingSample: event.target.value,
                        }))
                    }
                    placeholder={t('agentCreation.wizard.customWritingSamplePlaceholder')}
                    className={NewAgentWizardClassNames.textarea}
                />
                {state.customWritingSample.trim() !== '' && (
                    <div className="mt-3">
                        <WritingSamplePreview
                            title={t('agentCreation.wizard.customWritingSamplePreviewTitle')}
                            assistantMessage={state.customWritingSample.trim()}
                            userMessage={writingPreviewUserMessage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
