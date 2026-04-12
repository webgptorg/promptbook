import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { AgentCard } from '../Homepage/AgentCard';
import { HOMEPAGE_AGENT_GRID_CLASS } from '../Homepage/gridLayout';
import type { FederatedServerStatus } from '../Homepage/useFederatedAgents';
import { AgentCardsLoadingSkeleton } from '../Skeleton/AgentCardsLoadingSkeleton';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import { hasTeamReference, type NewAgentWizardState } from './NewAgentWizardState';
import { resolveWizardTeamReference } from './resolveWizardTeamReference';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';
import { useWizardTeamAgents, type WizardTeamAgent } from './useWizardTeamAgents';
import { WizardChipInput } from './WizardChipInput';

/**
 * Canonical compact reference that lets the agent ask the current human for input.
 */
const USER_TEAM_REFERENCE = '{User}';

/**
 * Number of placeholder cards rendered while one teammate section loads.
 */
const TEAM_PICKER_LOADING_CARD_COUNT = 5;

/**
 * Props for one card-grid section inside the teammate picker.
 */
type TeamAgentSectionProps = {
    /**
     * Heading shown above the section grid.
     */
    readonly title: string;

    /**
     * Current server URL used to distinguish local compact references from remote URLs.
     */
    readonly currentServerUrl: string;

    /**
     * Agents displayed in this section.
     */
    readonly agents: ReadonlyArray<WizardTeamAgent>;

    /**
     * Already selected teammate references.
     */
    readonly selectedTeamReferences: ReadonlyArray<string>;

    /**
     * Whether the section is still loading.
     */
    readonly isLoading: boolean;

    /**
     * Optional loading error message.
     */
    readonly errorMessage?: string;

    /**
     * Empty-state copy shown when no agents are available.
     */
    readonly emptyLabel: string;

    /**
     * Badge text rendered on selected cards.
     */
    readonly selectionStateLabel: string;

    /**
     * Toggles one teammate reference from the card grid.
     */
    readonly onToggleTeamReference: (reference: string) => void;
};

/**
 * Returns a short hostname label for one federated server section heading.
 *
 * @param serverUrl - Federated server URL.
 * @returns Human-readable hostname fallback.
 */
function getServerHeadingLabel(serverUrl: string): string {
    try {
        return new URL(serverUrl).hostname;
    } catch {
        return serverUrl;
    }
}

/**
 * Renders one local or federated teammate section using the shared homepage agent cards.
 *
 * @param props - Section props.
 * @returns Teammate picker section.
 */
function TeamAgentSection(props: TeamAgentSectionProps) {
    const {
        title,
        currentServerUrl,
        agents,
        selectedTeamReferences,
        isLoading,
        errorMessage,
        emptyLabel,
        selectionStateLabel,
        onToggleTeamReference,
    } = props;

    return (
        <section>
            <h4 className="text-sm font-semibold text-slate-900">{title}</h4>

            <div className="mt-3">
                {isLoading ? (
                    <AgentCardsLoadingSkeleton cardCount={TEAM_PICKER_LOADING_CARD_COUNT} />
                ) : errorMessage ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <div className="flex items-start gap-2">
                            <AlertCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <div>{errorMessage}</div>
                        </div>
                    </div>
                ) : agents.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {emptyLabel}
                    </div>
                ) : (
                    <div className={HOMEPAGE_AGENT_GRID_CLASS}>
                        {agents.map((agent) => {
                            const teamReference = resolveWizardTeamReference(agent, currentServerUrl);

                            return (
                                <AgentCard
                                    key={agent.url}
                                    agent={agent}
                                    publicUrl={currentServerUrl || agent.serverUrl || ''}
                                    serverUrl={agent.serverUrl}
                                    onSelect={() => onToggleTeamReference(teamReference)}
                                    isSelected={hasTeamReference(selectedTeamReferences, teamReference)}
                                    selectionStateLabel={selectionStateLabel}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}

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
     * Toggles one teammate reference directly from the selectable card grid.
     */
    readonly toggleTeamReference: (reference: string) => void;

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
    const {
        state,
        setState,
        t,
        addTeamReferenceFromDraft,
        addTeamReference,
        toggleTeamReference,
        removeTeamReference,
    } = props;
    const {
        currentServerUrl,
        localAgents,
        localAgentsStatus,
        federatedTeamAgents,
        federatedServersStatus,
        federatedServerUrls,
    } = useWizardTeamAgents();
    const isUserSelected = hasTeamReference(state.teamReferences, USER_TEAM_REFERENCE);
    const selectionStateLabel = t('agentCreation.wizard.teamSelectedBadge');

    const federatedAgentsByServer = useMemo(() => {
        const groupedAgents = new Map<string, Array<WizardTeamAgent>>();

        for (const agent of federatedTeamAgents) {
            if (!agent.serverUrl) {
                continue;
            }

            const existingAgents = groupedAgents.get(agent.serverUrl) || [];
            existingAgents.push(agent);
            groupedAgents.set(agent.serverUrl, existingAgents);
        }

        return groupedAgents;
    }, [federatedTeamAgents]);

    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <WizardChipInput
                    label={t('agentCreation.wizard.teamLabel')}
                    draftValue={state.teamReferenceDraft}
                    placeholder={t('agentCreation.wizard.teamPlaceholder')}
                    chips={state.teamReferences}
                    chipVariant="emerald"
                    onDraftChange={(teamReferenceDraft) =>
                        setState((previous) => ({ ...previous, teamReferenceDraft }))
                    }
                    onAdd={addTeamReferenceFromDraft}
                    onRemove={removeTeamReference}
                    removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
                />

                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => addTeamReference(USER_TEAM_REFERENCE)}
                        className={`${NewAgentWizardClassNames.secondaryButton} ${
                            isUserSelected
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : ''
                        }`}
                    >
                        {t('agentCreation.wizard.teamAddUserAction')}
                    </button>
                    <p className="text-sm text-slate-500">{t('agentCreation.wizard.teamHint')}</p>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">
                        {t('agentCreation.wizard.teamPickerTitle')}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{t('agentCreation.wizard.teamPickerHint')}</p>
                </div>

                <div className="mt-5 space-y-6">
                    <TeamAgentSection
                        title={t('agentCreation.wizard.teamLocalSectionTitle', {
                            count: String(localAgents.length),
                        })}
                        currentServerUrl={currentServerUrl}
                        agents={localAgents}
                        selectedTeamReferences={state.teamReferences}
                        isLoading={localAgentsStatus.status === 'loading'}
                        errorMessage={
                            localAgentsStatus.status === 'error'
                                ? localAgentsStatus.error || t('agentCreation.wizard.teamLoadFailed')
                                : undefined
                        }
                        emptyLabel={t('agentCreation.wizard.teamNoAvailableAgents')}
                        selectionStateLabel={selectionStateLabel}
                        onToggleTeamReference={toggleTeamReference}
                    />

                    {federatedServerUrls.map((serverUrl) => {
                        const agents = federatedAgentsByServer.get(serverUrl) || [];
                        const serverStatus: FederatedServerStatus | undefined = federatedServersStatus[serverUrl];

                        if (serverStatus?.status === 'success' && agents.length === 0) {
                            return null;
                        }

                        return (
                            <TeamAgentSection
                                key={serverUrl}
                                title={t('agentCreation.wizard.teamFederatedSectionTitle', {
                                    serverName: getServerHeadingLabel(serverUrl),
                                    count: String(agents.length),
                                })}
                                currentServerUrl={currentServerUrl}
                                agents={agents}
                                selectedTeamReferences={state.teamReferences}
                                isLoading={serverStatus?.status === 'loading'}
                                errorMessage={
                                    serverStatus?.status === 'error'
                                        ? serverStatus.error || t('agentCreation.wizard.teamLoadFailed')
                                        : undefined
                                }
                                emptyLabel={t('agentCreation.wizard.teamNoAvailableAgents')}
                                selectionStateLabel={selectionStateLabel}
                                onToggleTeamReference={toggleTeamReference}
                            />
                        );
                    })}
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
