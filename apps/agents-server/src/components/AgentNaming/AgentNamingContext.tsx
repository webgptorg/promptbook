'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_AGENT_NAMING, formatAgentNamingText, type AgentNaming } from '../../utils/agentNaming';

/**
 * Context value for agent naming utilities.
 */
type AgentNamingContextValue = {
    /**
     * Normalized naming configuration.
     */
    readonly naming: AgentNaming;
    /**
     * Formats a UI string using the active naming configuration.
     */
    readonly formatText: (text: string) => string;
};

const DEFAULT_CONTEXT_VALUE: AgentNamingContextValue = {
    naming: DEFAULT_AGENT_NAMING,
    formatText: (text: string) => formatAgentNamingText(text, DEFAULT_AGENT_NAMING),
};

const AgentNamingContext = createContext<AgentNamingContextValue>(DEFAULT_CONTEXT_VALUE);

/**
 * Props for AgentNamingProvider.
 */
type AgentNamingProviderProps = {
    /**
     * Active naming configuration.
     */
    readonly naming: AgentNaming;
    /**
     * Child components that can access naming utilities.
     */
    readonly children: ReactNode;
};

/**
 * Provides agent naming utilities to client components.
 *
 * @param props - Provider props.
 * @returns Provider wrapper with naming context.
 */
export function AgentNamingProvider({ naming, children }: AgentNamingProviderProps) {
    const value = useMemo<AgentNamingContextValue>(
        () => ({
            naming,
            formatText: (text: string) => formatAgentNamingText(text, naming),
        }),
        [naming],
    );

    return <AgentNamingContext.Provider value={value}>{children}</AgentNamingContext.Provider>;
}

/**
 * Accesses agent naming utilities from context.
 *
 * @returns Agent naming context value.
 */
export function useAgentNaming(): AgentNamingContextValue {
    return useContext(AgentNamingContext);
}
