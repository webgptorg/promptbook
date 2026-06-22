import type { NewAgentWizardMode } from '../../constants/newAgentWizard';

/**
 * Funnel event names emitted by the new-agent creation experience.
 */
export type NewAgentCreationEventName =
    | 'new_agent_flow_assigned'
    | 'new_agent_wizard_shown'
    | 'new_agent_wizard_completed'
    | 'new_agent_created'
    | 'new_agent_editor_opened_after_creation';

/**
 * Optional event dimensions attached to the funnel analytics payload.
 */
export type TrackNewAgentCreationEventOptions = {
    /**
     * Metadata-controlled flow assignment.
     */
    readonly mode: NewAgentWizardMode;
    /**
     * Concrete surface the user interacted with.
     */
    readonly surface?: 'editor' | 'wizard';
    /**
     * Folder scope where the flow started.
     */
    readonly folderId?: number | null;
    /**
     * Number of collected knowledge items.
     */
    readonly knowledgeCount?: number;
};

/**
 * Browser globals used by optional analytics integrations.
 */
type NewAgentCreationAnalyticsWindow = Window & {
    /**
     * Optional Google Analytics helper exposed by the injected integrations snippet.
     */
    gtag?: (command: string, eventName: string, parameters?: Record<string, unknown>) => void;
    /**
     * Optional GTM-style data layer used as a best-effort fallback.
     */
    dataLayer?: Array<Record<string, unknown>>;
};

/**
 * Emits a funnel event for the new-agent flow without hard-coding one analytics vendor.
 *
 * @param eventName - Stable event identifier.
 * @param options - Optional event dimensions.
 */
export function trackNewAgentCreationEvent(
    eventName: NewAgentCreationEventName,
    options: TrackNewAgentCreationEventOptions,
): void {
    if (typeof window === 'undefined') {
        return;
    }

    const payload = {
        mode: options.mode,
        ...(options.surface ? { surface: options.surface } : {}),
        ...(options.folderId === undefined ? {} : { folderId: options.folderId }),
        ...(typeof options.knowledgeCount === 'number' ? { knowledgeCount: options.knowledgeCount } : {}),
    };
    const analyticsWindow = window as NewAgentCreationAnalyticsWindow;

    analyticsWindow.gtag?.('event', eventName, payload);
    analyticsWindow.dataLayer?.push({
        event: eventName,
        ...payload,
    });
    window.dispatchEvent(
        new CustomEvent('promptbook:new-agent-flow', {
            detail: {
                eventName,
                ...payload,
            },
        }),
    );
}
