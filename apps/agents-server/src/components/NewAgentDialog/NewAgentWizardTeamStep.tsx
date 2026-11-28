import { useMemo } from 'react';
import { AgentCardsSection } from '../Homepage/AgentCardsSection';
import { getServerHeadingLabel } from '../Homepage/getServerHeadingLabel';
import type { FederatedServerStatus } from '../Homepage/useFederatedAgents';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import { hasTeamReference, type NewAgentWizardState } from './NewAgentWizardState';
import { resolveWizardTeamReference } from './resolveWizardTeamReference';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';
import { useWizardTeamAgents, type WizardTeamAgent } from './useWizardTeamAgents';

/**
 * Number of placeholder cards rendered while one teammate section loads.
 */
const TEAM_PICKER_LOADING_CARD_COUNT = 5;

/**
 * Props for the team step in the new-agent wizard.
 */
type NewAgentWizardTeamStepProps = {
    /**
     * Current wizard state.
     */
    readonly state: NewAgentWizardState;

    /**
     * Translation helper.
     */
    readonly t: NewAgentWizardTranslate;

    /**
     * Toggles one teammate reference directly from the selectable card grid.
     */
    readonly toggleTeamReference: (reference: string) => void;
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
    const { state, t, toggleTeamReference } = props;
    const {
        currentServerUrl,
        localAgents,
        localAgentsStatus,
        federatedTeamAgents,
        federatedServersStatus,
        federatedServerUrls,
    } = useWizardTeamAgents();
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
        <div className="mt-4">
            <div className={NewAgentWizardClassNames.surfaceCard}>
                <div>
                    <h3 className={NewAgentWizardClassNames.sectionTitle}>{t('agentCreation.wizard.teamPickerTitle')}</h3>
                    <p className={`mt-1 ${NewAgentWizardClassNames.sectionHint}`}>{t('agentCreation.wizard.teamPickerHint')}</p>
                </div>

                <div className="mt-5 space-y-6">
                    <AgentCardsSection
                        title={t('agentCreation.wizard.teamLocalSectionTitle', {
                            count: String(localAgents.length),
                        })}
                        publicUrl={currentServerUrl || ''}
                        agents={localAgents}
                        isLoading={localAgentsStatus.status === 'loading'}
                        errorMessage={
                            localAgentsStatus.status === 'error'
                                ? localAgentsStatus.error || t('agentCreation.wizard.teamLoadFailed')
                                : undefined
                        }
                        emptyLabel={t('agentCreation.wizard.teamNoAvailableAgents')}
                        loadingCardCount={TEAM_PICKER_LOADING_CARD_COUNT}
                        onSelectAgent={(agent) =>
                            toggleTeamReference(resolveWizardTeamReference(agent, currentServerUrl))
                        }
                        isAgentSelected={(agent) =>
                            hasTeamReference(state.teamReferences, resolveWizardTeamReference(agent, currentServerUrl))
                        }
                        selectionStateLabel={selectionStateLabel}
                        sectionClassName="mt-0 mb-0 first:mt-0"
                        titleClassName="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100"
                    />

                    {federatedServerUrls.map((serverUrl) => {
                        const agents = federatedAgentsByServer.get(serverUrl) || [];
                        const serverStatus: FederatedServerStatus | undefined = federatedServersStatus[serverUrl];

                        if (serverStatus?.status === 'success' && agents.length === 0) {
                            return null;
                        }

                        return (
                            <AgentCardsSection
                                key={serverUrl}
                                title={t('agentCreation.wizard.teamFederatedSectionTitle', {
                                    serverName: getServerHeadingLabel(serverUrl),
                                    count: String(agents.length),
                                })}
                                publicUrl={currentServerUrl || serverUrl}
                                agents={agents}
                                isLoading={serverStatus?.status === 'loading'}
                                errorMessage={
                                    serverStatus?.status === 'error'
                                        ? serverStatus.error || t('agentCreation.wizard.teamLoadFailed')
                                        : undefined
                                }
                                emptyLabel={t('agentCreation.wizard.teamNoAvailableAgents')}
                                loadingCardCount={TEAM_PICKER_LOADING_CARD_COUNT}
                                onSelectAgent={(agent) =>
                                    toggleTeamReference(resolveWizardTeamReference(agent, currentServerUrl))
                                }
                                isAgentSelected={(agent) =>
                                    hasTeamReference(state.teamReferences, resolveWizardTeamReference(agent, currentServerUrl))
                                }
                                selectionStateLabel={selectionStateLabel}
                                sectionClassName="mt-0 mb-0 first:mt-0"
                                titleClassName="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100"
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
