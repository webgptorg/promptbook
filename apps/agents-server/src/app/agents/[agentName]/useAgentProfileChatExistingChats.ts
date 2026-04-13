'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchUserChats, type UserChatSummary } from '../../../utils/userChatClient';

/**
 * Inputs used by `useAgentProfileChatExistingChats`.
 *
 * @private internal type of <AgentProfileChat/>
 */
type UseAgentProfileChatExistingChatsProps = {
    agentName: string;
    isHistoryEnabled: boolean;
    isPrivateModeEnabled: boolean;
};

/**
 * Existing-chat state exposed to `AgentProfileChat`.
 *
 * @private internal type of <AgentProfileChat/>
 */
type UseAgentProfileChatExistingChatsResult = {
    existingChats: Array<UserChatSummary>;
    hasExistingChats: boolean;
};

/**
 * Returns true when the profile route should load resumable user chats.
 */
function shouldLoadAgentProfileChatExistingChats({
    isHistoryEnabled,
    isPrivateModeEnabled,
}: Pick<UseAgentProfileChatExistingChatsProps, 'isHistoryEnabled' | 'isPrivateModeEnabled'>): boolean {
    return isHistoryEnabled && !isPrivateModeEnabled;
}

/**
 * Loads the resumable chat list shown above the profile chat preview.
 *
 * @private function of AgentProfileChat
 */
export function useAgentProfileChatExistingChats(
    props: UseAgentProfileChatExistingChatsProps,
): UseAgentProfileChatExistingChatsResult {
    const { agentName, isHistoryEnabled, isPrivateModeEnabled } = props;
    const [existingChats, setExistingChats] = useState<Array<UserChatSummary>>([]);

    useEffect(() => {
        if (!shouldLoadAgentProfileChatExistingChats({ isHistoryEnabled, isPrivateModeEnabled })) {
            setExistingChats([]);
            return;
        }

        let isActive = true;

        async function loadExistingChats(): Promise<void> {
            try {
                const snapshot = await fetchUserChats(agentName);
                if (!isActive) {
                    return;
                }

                setExistingChats(snapshot.chats);
            } catch (error) {
                console.error('[AgentProfileChat] Failed to load existing chats', error);
            }
        }

        void loadExistingChats();

        return () => {
            isActive = false;
        };
    }, [agentName, isHistoryEnabled, isPrivateModeEnabled]);

    const hasExistingChats = useMemo(
        () => shouldLoadAgentProfileChatExistingChats({ isHistoryEnabled, isPrivateModeEnabled }) && existingChats.length > 0,
        [existingChats.length, isHistoryEnabled, isPrivateModeEnabled],
    );

    return {
        existingChats,
        hasExistingChats,
    };
}
