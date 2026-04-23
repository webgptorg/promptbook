'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { AvatarVisualId } from '../../../../../src/avatars/types/AvatarVisualDefinition';
import { DEFAULT_AGENT_AVATAR_VISUAL_ID } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';

/**
 * Props for the shared default-agent-avatar visual provider.
 */
type DefaultAgentAvatarVisualProviderProps = {
    /**
     * Children that can resolve the server-wide default avatar visual.
     */
    readonly children: ReactNode;

    /**
     * Metadata-resolved built-in visual id used when an agent has no `META IMAGE`.
     */
    readonly defaultAgentAvatarVisualId: AvatarVisualId;
};

/**
 * Context storing the active metadata-resolved default agent avatar visual.
 */
const DefaultAgentAvatarVisualContext = createContext<AvatarVisualId>(DEFAULT_AGENT_AVATAR_VISUAL_ID);

/**
 * Provides the metadata-resolved default avatar visual to live Agents Server avatar surfaces.
 *
 * @private shared provider of Agents Server avatar components
 */
export function DefaultAgentAvatarVisualProvider({
    children,
    defaultAgentAvatarVisualId,
}: DefaultAgentAvatarVisualProviderProps) {
    return (
        <DefaultAgentAvatarVisualContext.Provider value={defaultAgentAvatarVisualId}>
            {children}
        </DefaultAgentAvatarVisualContext.Provider>
    );
}

/**
 * Reads the metadata-resolved default avatar visual used by Agents Server live avatars.
 *
 * @returns Active default built-in avatar visual id.
 *
 * @private shared hook of Agents Server avatar components
 */
export function useDefaultAgentAvatarVisualId(): AvatarVisualId {
    return useContext(DefaultAgentAvatarVisualContext);
}
