'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Runtime layout data shared between the profile preview and full chat pages.
 */
export type AgentPageContextValue = {
    readonly agentName: string;
    readonly agentUrl: string;
    readonly fullname: string;
    readonly avatarSrc: string;
    readonly brandColorHex: string;
    readonly brandColor: string | null;
    readonly speechRecognitionLanguage?: string;
    readonly thinkingMessages: ReadonlyArray<string>;
    /**
     * Default state for chat sounds when no preference exists.
     */
    readonly defaultIsSoundsOn: boolean;
    /**
     * Default state for chat vibration when no preference exists.
     */
    readonly defaultIsVibrationOn: boolean;
};

const AgentPageContext = createContext<AgentPageContextValue | null>(null);

/**
 * Props for the shared agent context provider.
 */
export type AgentPageContextProviderProps = {
    readonly value: AgentPageContextValue;
    readonly children: ReactNode;
};

/**
 * Supplies the shared agent data to descendant client components.
 */
export function AgentPageContextProvider({ value, children }: AgentPageContextProviderProps) {
    return <AgentPageContext.Provider value={value}>{children}</AgentPageContext.Provider>;
}

/**
 * Reads the current agent layout metadata from context.
 */
export function useAgentPageContext(): AgentPageContextValue {
    const context = useContext(AgentPageContext);
    if (!context) {
        throw new Error('useAgentPageContext must be used within AgentPageContextProvider');
    }
    return context;
}
