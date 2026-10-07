'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

import type { AgentVisibility } from '../../../../../utils/agentVisibility';
import { ONBOARDING_STEPS } from '../../config/steps';
import { useManGoOnboardingNavigation } from '../../ManGoOnboardingNavigation';
import { createManGoAgentSource } from '../../services/createManGoAgentSource';
import { useOnboarding } from '../../state/OnboardingProvider';
import { SectionLabel, StepCard } from '../StepFrame';
import { Banner } from '../ui/Banner';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

/**
 * Created-agent payload returned by the host Agents Server dialog controller.
 */
export type ManGoCreatedAgentPayload = {
    /**
     * Permanent id of the created agent.
     */
    readonly permanentId: string;

    /**
     * Route opened when the user leaves the completion screen.
     */
    readonly targetPath: string;
};

/**
 * Props accepted by the completion step.
 */
type DoneStepProps = {
    /**
     * Default visibility resolved from server metadata.
     */
    readonly defaultVisibility: AgentVisibility;

    /**
     * Creates the real Agents Server agent.
     */
    readonly onCreate: (request: {
        readonly agentSource: ReturnType<typeof createManGoAgentSource>;
        readonly visibility: AgentVisibility;
        readonly knowledgeCount: number;
    }) => Promise<ManGoCreatedAgentPayload>;

    /**
     * Opens the created agent route selected by the host dialog controller.
     */
    readonly onOpenCreatedAgent: (targetPath: string) => void;
};

/** Displays one completion summary value. */
function SummaryRow({ label, value }: { readonly label: string; readonly value: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-2.5 last:border-b-0">
            <span className="text-sm text-zinc-500">{label}</span>
            <span className="text-sm font-medium text-zinc-900">{value}</span>
        </div>
    );
}

/** Saves and displays the identity retained by this creation session alone. */
export function DoneStep(props: DoneStepProps) {
    const { defaultVisibility, onCreate, onOpenCreatedAgent } = props;
    const { navigateToPath } = useManGoOnboardingNavigation();
    const { state, actions, reset } = useOnboarding();
    const { isCreatingAgent, creationError } = state;

    const knowledgeCount = state.knowledge.length;
    const isTested = state.testMessages.some((message) => message.role === 'user');
    const isBookAvailable = state.bookSource.trim().length > 0;
    const isCreated = Boolean(state.savedAgentId && state.savedAgentTargetPath);

    // Duplicate submission protection belongs to the session, including effect replay/remounts.
    useEffect(() => {
        void actions.createAgent(onCreate, defaultVisibility);
    }, [actions, defaultVisibility, onCreate]);

    return (
        <div className="mx-auto max-w-xl text-center">
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-emerald-100/70 blur-md" aria-hidden />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 text-4xl shadow-[var(--ob-shadow-md)] ring-1 ring-emerald-200/60">
                    🎉
                </span>
            </div>
            <h1 className="ob-display text-[28px] font-bold tracking-tight text-zinc-900">Agent v1 je uložen!</h1>
            <p className="mt-2 text-sm text-zinc-500">
                {state.agentName.trim()
                    ? `${state.agentName.trim()} je připraven k dalšímu rozvoji.`
                    : 'Agent je připraven k dalšímu rozvoji.'}
            </p>

            {isCreatingAgent && (
                <Banner tone="info" className="mt-6 text-left" title="Ukládám agenta">
                    První verze se ukládá do Agents Serveru.
                </Banner>
            )}

            {creationError && (
                <Banner tone="error" className="mt-6 text-left" title="Agenta se nepodařilo uložit">
                    {creationError}
                </Banner>
            )}

            <StepCard className="mt-8 text-left">
                <SectionLabel className="mb-3">Shrnutí první verze</SectionLabel>
                <SummaryRow label="Název agenta" value={state.agentName.trim() || '—'} />
                <SummaryRow
                    label="Book"
                    value={
                        <Badge tone={isBookAvailable ? 'success' : 'neutral'} dot={isBookAvailable}>
                            {isBookAvailable ? 'Definován' : 'Prázdný'}
                        </Badge>
                    }
                />
                <SummaryRow
                    label="Znalostní báze"
                    value={
                        <Badge tone={knowledgeCount > 0 ? 'accent' : 'neutral'}>
                            {knowledgeCount === 0 ? 'Žádné zdroje' : `${knowledgeCount} zdroje/ů`}
                        </Badge>
                    }
                />
                <SummaryRow
                    label="Testování"
                    value={
                        <Badge tone={isTested ? 'success' : 'neutral'} dot={isTested}>
                            {isTested ? 'Provedeno' : 'Neproběhlo'}
                        </Badge>
                    }
                />
                <SummaryRow
                    label="Uložení"
                    value={
                        <Badge tone={isCreated ? 'success' : creationError ? 'error' : 'neutral'} dot={isCreated}>
                            {isCreated ? 'Uloženo' : creationError ? 'Chyba' : 'Probíhá'}
                        </Badge>
                    }
                />
            </StepCard>

            <div className="mt-7 flex flex-col gap-3">
                <Button
                    trailingIcon={<span aria-hidden>→</span>}
                    disabled={(!state.savedAgentTargetPath && !creationError) || isCreatingAgent}
                    onClick={() => {
                        if (creationError) {
                            void actions.createAgent(onCreate, defaultVisibility, true);
                            return;
                        }

                        if (state.savedAgentTargetPath) {
                            onOpenCreatedAgent(state.savedAgentTargetPath);
                        }
                    }}
                >
                    {creationError ? 'Zkusit uložit znovu' : 'Přejít na chat agenta'}
                </Button>
                <Button
                    variant="outline"
                    disabled={isCreatingAgent}
                    onClick={() => navigateToPath(ONBOARDING_STEPS[0].path)}
                >
                    Upravit agenta
                </Button>
                <Button variant="ghost" disabled={isCreatingAgent} onClick={reset}>
                    Začít nový onboarding
                </Button>
            </div>
        </div>
    );
}
