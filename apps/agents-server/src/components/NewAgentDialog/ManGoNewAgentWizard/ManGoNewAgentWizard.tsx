'use client';

import type { string_book } from '@promptbook-local/types';
import { useCallback, useMemo, useState } from 'react';
import type { NewAgentWizardMode } from '../../../constants/newAgentWizard';
import type { AgentVisibility } from '../../../utils/agentVisibility';
import { Dialog } from '../../Portal/Dialog';
import { ONBOARDING_ENTRY_PATH, ONBOARDING_STEPS } from './config/steps';
import { ManGoOnboardingNavigationContext } from './ManGoOnboardingNavigation';
import { OnboardingProvider } from './state/OnboardingProvider';
import { WizardShell } from './components/WizardShell';
import { BookStep } from './components/steps/BookStep';
import { DoneStep, type ManGoCreatedAgentPayload } from './components/steps/DoneStep';
import { KnowledgeStep } from './components/steps/KnowledgeStep';
import { TestStep } from './components/steps/TestStep';
import { ZadaniStep } from './components/steps/ZadaniStep';

/**
 * Props accepted by the imported manGo new-agent wizard.
 */
type ManGoNewAgentWizardProps = {
    /**
     * Metadata-driven flow assignment used for analytics.
     */
    readonly mode: NewAgentWizardMode;

    /**
     * Default visibility resolved from server metadata.
     */
    readonly defaultVisibility: AgentVisibility;

    /**
     * Folder scope where the flow was opened.
     */
    readonly folderId?: number | null;

    /**
     * Requests closing the fullscreen wizard.
     */
    readonly onClose: () => void;

    /**
     * Persists the synthesized agent source using the existing create-agent endpoint.
     */
    readonly onCreate: (request: ManGoNewAgentWizardCreateRequest) => Promise<ManGoCreatedAgentPayload>;

    /**
     * Opens the created agent route after the completion screen.
     */
    readonly onOpenCreatedAgent: (targetPath: string) => void;
};

/**
 * Payload submitted when the manGo wizard creates an agent.
 */
export type ManGoNewAgentWizardCreateRequest = {
    /**
     * Book source synthesized from the wizard session.
     */
    readonly agentSource: string_book;

    /**
     * Explicit visibility used for the created agent.
     */
    readonly visibility: AgentVisibility;

    /**
     * Number of ready knowledge sources included in the final source.
     */
    readonly knowledgeCount: number;
};

/**
 * Renders the current local route from the imported manGo wizard.
 *
 * @param props - Current route and create-agent callbacks.
 * @returns Step component for the current route.
 */
function renderManGoWizardStep(props: {
    readonly currentPath: string;
    readonly defaultVisibility: AgentVisibility;
    readonly onCreate: ManGoNewAgentWizardProps['onCreate'];
    readonly onOpenCreatedAgent: ManGoNewAgentWizardProps['onOpenCreatedAgent'];
}) {
    const { currentPath, defaultVisibility, onCreate, onOpenCreatedAgent } = props;

    switch (currentPath) {
        case ONBOARDING_STEPS[0].path:
            return <BookStep />;
        case ONBOARDING_STEPS[1].path:
            return <KnowledgeStep />;
        case ONBOARDING_STEPS[2].path:
            return <TestStep />;
        case ONBOARDING_STEPS[3].path:
            return (
                <DoneStep
                    defaultVisibility={defaultVisibility}
                    onCreate={onCreate}
                    onOpenCreatedAgent={onOpenCreatedAgent}
                />
            );
        case ONBOARDING_ENTRY_PATH:
        default:
            return <ZadaniStep />;
    }
}

/**
 * Renders the imported manGo fullscreen new-agent wizard.
 *
 * @param props - Wizard callbacks and metadata-backed defaults.
 * @returns Fullscreen create-agent wizard dialog.
 */
export function ManGoNewAgentWizard(props: ManGoNewAgentWizardProps) {
    const { defaultVisibility, onClose, onCreate, onOpenCreatedAgent } = props;
    const [currentPath, setCurrentPath] = useState(ONBOARDING_ENTRY_PATH);
    const navigateToPath = useCallback((path: string) => {
        setCurrentPath(path);
    }, []);
    const navigationContextValue = useMemo(
        () => ({
            currentPath,
            navigateToPath,
            requestClose: onClose,
        }),
        [currentPath, navigateToPath, onClose],
    );

    return (
        <Dialog
            onClose={onClose}
            ariaLabel="manGo wizard"
            isBackdropDismissible={false}
            backdropClassName="items-stretch justify-stretch bg-slate-950/80 p-0 backdrop-blur-0"
            className="!h-[100dvh] !w-screen !max-w-none !overflow-hidden !rounded-none !border-0 !bg-transparent !p-0 !shadow-none"
        >
            <ManGoOnboardingNavigationContext.Provider value={navigationContextValue}>
                <OnboardingProvider>
                    <WizardShell>
                        {renderManGoWizardStep({
                            currentPath,
                            defaultVisibility,
                            onCreate,
                            onOpenCreatedAgent,
                        })}
                    </WizardShell>
                </OnboardingProvider>
            </ManGoOnboardingNavigationContext.Provider>
        </Dialog>
    );
}
