'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';

/**
 * Subset of agent information that the Header breadcrumb needs to render an agent's name (and avatar)
 * even when the active agent is not part of the loaded organization list.
 *
 * @private mechanism of Agents Server header
 */
export type ActiveAgentBreadcrumbInfo = Pick<
    AgentBasicInformation,
    'agentName' | 'agentHash' | 'permanentId' | 'meta'
>;

/**
 * Internal shape of the active-agent breadcrumb context.
 *
 * @private type of Header
 */
type ActiveAgentBreadcrumbContextValue = {
    readonly activeAgentBreadcrumbInfo: ActiveAgentBreadcrumbInfo | null;
    readonly setActiveAgentBreadcrumbInfo: (info: ActiveAgentBreadcrumbInfo | null) => void;
};

/**
 * Context that lets agent pages share the active agent's display info with the Header.
 *
 * @private mechanism of Agents Server header
 */
const ActiveAgentBreadcrumbContext = createContext<ActiveAgentBreadcrumbContextValue | null>(null);

/**
 * Provides storage for the active agent's breadcrumb info to the Header.
 *
 * @private function of Header
 */
export function ActiveAgentBreadcrumbProvider({ children }: { readonly children: ReactNode }) {
    const [activeAgentBreadcrumbInfo, setActiveAgentBreadcrumbInfo] = useState<ActiveAgentBreadcrumbInfo | null>(null);

    const value = useMemo<ActiveAgentBreadcrumbContextValue>(
        () => ({ activeAgentBreadcrumbInfo, setActiveAgentBreadcrumbInfo }),
        [activeAgentBreadcrumbInfo],
    );

    return <ActiveAgentBreadcrumbContext.Provider value={value}>{children}</ActiveAgentBreadcrumbContext.Provider>;
}

/**
 * Reads the active agent's breadcrumb info, used by the Header to render the agent's name in
 * the breadcrumb whenever the agent is not present in the loaded organization list.
 *
 * @private function of Header
 */
export function useActiveAgentBreadcrumbInfo(): ActiveAgentBreadcrumbInfo | null {
    return useContext(ActiveAgentBreadcrumbContext)?.activeAgentBreadcrumbInfo ?? null;
}

/**
 * Registers the active agent's breadcrumb info while the calling component is mounted.
 * Pages that have loaded the agent profile call this hook so the Header breadcrumb can show
 * the agent's name instead of falling back to its identifier.
 *
 * @private function of Header
 */
export function useRegisterActiveAgentBreadcrumbInfo(info: ActiveAgentBreadcrumbInfo | null): void {
    const context = useContext(ActiveAgentBreadcrumbContext);
    const setter = context?.setActiveAgentBreadcrumbInfo;

    useEffect(() => {
        if (!setter) {
            return;
        }

        setter(info);

        return () => {
            setter(null);
        };
    }, [info, setter]);
}
