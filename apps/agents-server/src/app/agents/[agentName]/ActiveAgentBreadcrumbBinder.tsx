'use client';

import {
    useRegisterActiveAgentBreadcrumbInfo,
    type ActiveAgentBreadcrumbInfo,
} from '../../../components/Header/ActiveAgentBreadcrumbContext';

/**
 * Props for the active-agent breadcrumb binder.
 *
 * @private type of agent routes
 */
type ActiveAgentBreadcrumbBinderProps = {
    /**
     * Resolved active agent that should be shown in the Header breadcrumb.
     */
    readonly agent: ActiveAgentBreadcrumbInfo;
};

/**
 * Registers the active agent with the Header breadcrumb context while the agent route is mounted.
 * Renders nothing on its own; its sole purpose is to make sure the Header can render the agent's
 * human-readable name instead of falling back to its URL identifier.
 *
 * @private function of agent routes
 */
export function ActiveAgentBreadcrumbBinder({ agent }: ActiveAgentBreadcrumbBinderProps) {
    useRegisterActiveAgentBreadcrumbInfo(agent);
    return null;
}
