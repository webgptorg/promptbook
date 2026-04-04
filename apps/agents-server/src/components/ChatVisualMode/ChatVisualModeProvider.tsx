'use client';

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import {
    CHAT_VISUAL_MODE_COOKIE_NAME,
    CHAT_VISUAL_MODE_STORAGE_KEY,
    DEFAULT_CHAT_VISUAL_MODE,
    resolveChatVisualMode,
    type ChatVisualMode,
} from '../../constants/chatVisualMode';

/**
 * Context value shared by the chat visual mode provider.
 */
type ChatVisualModeContextValue = {
    /**
     * Active chat visual mode used by chat surfaces.
     */
    readonly chatVisualMode: ChatVisualMode;
    /**
     * Setter used by control-panel overrides.
     */
    readonly setChatVisualMode: Dispatch<SetStateAction<ChatVisualMode>>;
};

/**
 * Provider props for chat visual mode context.
 */
type ChatVisualModeProviderProps = {
    /**
     * Children that can access the chat visual mode state.
     */
    readonly children: ReactNode;
    /**
     * Default visual mode resolved on the server from metadata/cookies.
     */
    readonly defaultChatVisualMode?: string | null;
};

/**
 * Default context value used before provider mount.
 */
const defaultChatVisualModeContextValue: ChatVisualModeContextValue = {
    chatVisualMode: DEFAULT_CHAT_VISUAL_MODE,
    setChatVisualMode: (nextMode) => {
        void nextMode;
    },
};

const ChatVisualModeContext = createContext<ChatVisualModeContextValue>(defaultChatVisualModeContextValue);

/**
 * Provides one shared chat visual mode state for the Agents Server UI.
 *
 * Metadata sets the default, while browser users can override it in the control panel.
 *
 * @private
 */
export function ChatVisualModeProvider({ children, defaultChatVisualMode }: ChatVisualModeProviderProps) {
    const [chatVisualMode, setChatVisualMode] = useState<ChatVisualMode>(() =>
        resolveChatVisualMode(defaultChatVisualMode),
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const storedMode = window.localStorage.getItem(CHAT_VISUAL_MODE_STORAGE_KEY);
        if (!storedMode) {
            return;
        }

        const resolvedStoredMode = resolveChatVisualMode(storedMode);
        setChatVisualMode((currentMode) => (currentMode === resolvedStoredMode ? currentMode : resolvedStoredMode));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(CHAT_VISUAL_MODE_STORAGE_KEY, chatVisualMode);
        document.cookie = `${CHAT_VISUAL_MODE_COOKIE_NAME}=${chatVisualMode}; path=/; max-age=31536000; samesite=lax`;
    }, [chatVisualMode]);

    const contextValue = useMemo<ChatVisualModeContextValue>(
        () => ({
            chatVisualMode,
            setChatVisualMode,
        }),
        [chatVisualMode],
    );

    return <ChatVisualModeContext.Provider value={contextValue}>{children}</ChatVisualModeContext.Provider>;
}

/**
 * Reads the active chat visual mode context.
 *
 * @returns Active visual mode state and setter.
 */
export function useChatVisualMode() {
    return useContext(ChatVisualModeContext);
}
