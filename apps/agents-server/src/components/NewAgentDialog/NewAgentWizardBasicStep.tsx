import type { Dispatch, SetStateAction } from 'react';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import type { NewAgentWizardState } from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';

/**
 * Props for the basic-details step in the new-agent wizard.
 */
type NewAgentWizardBasicStepProps = {
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
};

/**
 * Visibility options rendered in the basic-details step.
 */
const VISIBILITY_OPTIONS = [
    ['PRIVATE', 'agentCreation.wizard.visibilityPrivate'],
    ['UNLISTED', 'agentCreation.wizard.visibilityUnlisted'],
    ['PUBLIC', 'agentCreation.wizard.visibilityPublic'],
] as const satisfies ReadonlyArray<readonly [AgentVisibility, string]>;

/**
 * Renders the first wizard step with basic agent metadata.
 *
 * @param props - Step props.
 * @returns Basic-details step content.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function NewAgentWizardBasicStep(props: NewAgentWizardBasicStepProps) {
    const { state, setState, t } = props;

    return (
        <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">{t('agentCreation.wizard.nameLabel')}</label>
                <input
                    value={state.name}
                    onChange={(event) => setState((previous) => ({ ...previous, name: event.target.value }))}
                    placeholder={t('agentCreation.wizard.namePlaceholder')}
                    className={NewAgentWizardClassNames.input}
                />
                {state.name.trim() === '' && (
                    <p className="mt-2 text-sm text-amber-700">{t('agentCreation.wizard.nameRequired')}</p>
                )}
            </div>

            <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">
                    {t('agentCreation.wizard.descriptionLabel')}
                </label>
                <input
                    value={state.description}
                    onChange={(event) => setState((previous) => ({ ...previous, description: event.target.value }))}
                    placeholder={t('agentCreation.wizard.descriptionPlaceholder')}
                    className={NewAgentWizardClassNames.input}
                />
            </div>

            <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">{t('agentCreation.wizard.goalLabel')}</label>
                <textarea
                    value={state.goal}
                    onChange={(event) => setState((previous) => ({ ...previous, goal: event.target.value }))}
                    placeholder={t('agentCreation.wizard.goalPlaceholder')}
                    className={NewAgentWizardClassNames.textarea}
                />
            </div>

            <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">
                    {t('agentCreation.wizard.visibilityLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                    {VISIBILITY_OPTIONS.map(([visibility, labelKey]) => (
                        <button
                            key={visibility}
                            type="button"
                            onClick={() => setState((previous) => ({ ...previous, visibility }))}
                            className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                state.visibility === visibility
                                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                        >
                            {t(labelKey)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
