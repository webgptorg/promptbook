'use client';

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    fetchChatEnterBehaviorSettings,
    updateChatEnterBehaviorSettings,
} from '@/src/utils/chatEnterBehaviorClient';
import type { AgentsServerChatEnterBehavior } from '@/src/utils/chatEnterBehaviorSettings';
import { notifyError } from '../Notifications/notifications';
import { ChatEnterBehaviorPrompt } from './ChatEnterBehaviorPrompt';

/**
 * Session storage flag that suppresses the first-run keybinding dialog until the tab closes.
 */
const CHAT_ENTER_BEHAVIOR_PROMPT_DISMISSED_SESSION_KEY = 'agents-server-chat-enter-behavior-prompt-dismissed';

/**
 * Promise resolver signature stored while the keybinding dialog is open.
 */
type ChatEnterBehaviorResolver = (behavior: AgentsServerChatEnterBehavior | null) => void;

/**
 * Context value shared by the Agents Server chat keybinding provider.
 */
type ChatEnterBehaviorPreferencesContextValue = {
    readonly enterBehavior: AgentsServerChatEnterBehavior | undefined;
    readonly storedEnterBehavior: AgentsServerChatEnterBehavior | null;
    readonly isLoading: boolean;
    readonly isPersisting: boolean;
    readonly resolveEnterBehavior: () => Promise<AgentsServerChatEnterBehavior | null>;
    readonly setEnterBehavior: (behavior: AgentsServerChatEnterBehavior) => Promise<void>;
};

/**
 * React context used to expose shared chat Enter-key preferences.
 */
const ChatEnterBehaviorPreferencesContext = createContext<ChatEnterBehaviorPreferencesContextValue | null>(null);

/**
 * Props accepted by the shared chat keybinding provider.
 */
type ChatEnterBehaviorPreferencesProviderProps = {
    readonly children: ReactNode;
};

/**
 * Persists chat Enter-key preferences, exposes them to chat surfaces, and owns
 * the first-run keybinding dialog shown when no preference has been chosen yet.
 *
 * @private shared helper for the Agents Server UI
 */
export function ChatEnterBehaviorPreferencesProvider({
    children,
}: ChatEnterBehaviorPreferencesProviderProps) {
    const [storedEnterBehavior, setStoredEnterBehavior] = useState<AgentsServerChatEnterBehavior | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isPromptDismissedThisSession, setIsPromptDismissedThisSession] = useState(false);
    const [pendingPersistCount, setPendingPersistCount] = useState(0);
    const storedEnterBehaviorRef = useRef<AgentsServerChatEnterBehavior | null>(storedEnterBehavior);
    const isPromptDismissedThisSessionRef = useRef(isPromptDismissedThisSession);
    const pendingResolversRef = useRef<Array<ChatEnterBehaviorResolver>>([]);
    const loadPromiseRef = useRef<Promise<void> | null>(null);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        storedEnterBehaviorRef.current = storedEnterBehavior;
    }, [storedEnterBehavior]);

    useEffect(() => {
        isPromptDismissedThisSessionRef.current = isPromptDismissedThisSession;
    }, [isPromptDismissedThisSession]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        setIsPromptDismissedThisSession(
            window.sessionStorage.getItem(CHAT_ENTER_BEHAVIOR_PROMPT_DISMISSED_SESSION_KEY) === 'true',
        );
    }, []);

    /**
     * Resolves and clears any pending prompt waiters.
     */
    const resolvePendingResolvers = useCallback((behavior: AgentsServerChatEnterBehavior | null) => {
        const pendingResolvers = pendingResolversRef.current.splice(0, pendingResolversRef.current.length);
        pendingResolvers.forEach((resolve) => resolve(behavior));
    }, []);

    /**
     * Loads persisted keybindings for the current browser user.
     */
    const loadStoredEnterBehavior = useCallback(async () => {
        if (loadPromiseRef.current) {
            return loadPromiseRef.current;
        }

        loadPromiseRef.current = (async () => {
            try {
                const snapshot = await fetchChatEnterBehaviorSettings();
                if (storedEnterBehaviorRef.current === null) {
                    setStoredEnterBehavior(snapshot.enterBehavior);
                }
            } catch (error) {
                console.error('[chat-keybindings] Failed to load chat keybindings.', error);
            } finally {
                setIsLoaded(true);
                loadPromiseRef.current = null;
            }
        })();

        return loadPromiseRef.current;
    }, []);

    useEffect(() => {
        void loadStoredEnterBehavior();
    }, [loadStoredEnterBehavior]);

    /**
     * Queues one save request so rapid changes are persisted in order.
     */
    const persistEnterBehavior = useCallback(async (behavior: AgentsServerChatEnterBehavior): Promise<void> => {
        setPendingPersistCount((previousCount) => previousCount + 1);

        const persistencePromise = saveQueueRef.current
            .catch(() => undefined)
            .then(async () => {
                try {
                    await updateChatEnterBehaviorSettings(behavior);
                } catch (error) {
                    notifyError('We updated chat keybindings here, but could not save them to the server yet.');
                    throw error;
                } finally {
                    setPendingPersistCount((previousCount) => Math.max(0, previousCount - 1));
                }
            });

        saveQueueRef.current = persistencePromise.catch(() => undefined);
        await persistencePromise;
    }, []);

    /**
     * Applies one selected Enter behavior immediately and persists it in the background queue.
     */
    const setEnterBehavior = useCallback(
        async (behavior: AgentsServerChatEnterBehavior) => {
            setStoredEnterBehavior(behavior);
            setIsLoaded(true);
            setIsPromptOpen(false);
            setIsPromptDismissedThisSession(false);
            storedEnterBehaviorRef.current = behavior;
            isPromptDismissedThisSessionRef.current = false;
            resolvePendingResolvers(behavior);

            if (typeof window !== 'undefined') {
                window.sessionStorage.removeItem(CHAT_ENTER_BEHAVIOR_PROMPT_DISMISSED_SESSION_KEY);
            }

            await persistEnterBehavior(behavior).catch(() => undefined);
        },
        [persistEnterBehavior, resolvePendingResolvers],
    );

    /**
     * Dismisses the dialog for the current tab/session without persisting a choice.
     */
    const dismissPrompt = useCallback(() => {
        setIsPromptOpen(false);
        setIsPromptDismissedThisSession(true);
        isPromptDismissedThisSessionRef.current = true;
        resolvePendingResolvers(null);

        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(CHAT_ENTER_BEHAVIOR_PROMPT_DISMISSED_SESSION_KEY, 'true');
        }
    }, [resolvePendingResolvers]);

    /**
     * Resolves Enter behavior on demand when a chat surface has no stored preference yet.
     */
    const resolveEnterBehavior = useCallback(async (): Promise<AgentsServerChatEnterBehavior | null> => {
        if (!isLoaded) {
            await loadStoredEnterBehavior();
        }

        if (storedEnterBehaviorRef.current) {
            return storedEnterBehaviorRef.current;
        }

        if (isPromptDismissedThisSessionRef.current) {
            return null;
        }

        setIsPromptOpen(true);

        return await new Promise<AgentsServerChatEnterBehavior | null>((resolve) => {
            pendingResolversRef.current.push(resolve);
        });
    }, [isLoaded, loadStoredEnterBehavior]);

    useEffect(() => {
        return () => {
            resolvePendingResolvers(null);
        };
    }, [resolvePendingResolvers]);

    const enterBehavior = useMemo<AgentsServerChatEnterBehavior | undefined>(() => {
        if (!isLoaded) {
            return undefined;
        }

        return storedEnterBehavior || (isPromptDismissedThisSession ? 'SEND' : undefined);
    }, [isLoaded, isPromptDismissedThisSession, storedEnterBehavior]);

    const contextValue = useMemo<ChatEnterBehaviorPreferencesContextValue>(
        () => ({
            enterBehavior,
            storedEnterBehavior,
            isLoading: !isLoaded,
            isPersisting: pendingPersistCount > 0,
            resolveEnterBehavior,
            setEnterBehavior,
        }),
        [enterBehavior, isLoaded, pendingPersistCount, resolveEnterBehavior, setEnterBehavior, storedEnterBehavior],
    );

    return (
        <ChatEnterBehaviorPreferencesContext.Provider value={contextValue}>
            {children}
            <ChatEnterBehaviorPrompt
                isOpen={isPromptOpen}
                selectedBehavior={storedEnterBehavior || undefined}
                onSelectBehavior={(behavior) => {
                    void setEnterBehavior(behavior);
                }}
                onDismiss={dismissPrompt}
            />
        </ChatEnterBehaviorPreferencesContext.Provider>
    );
}

/**
 * Reads the shared Agents Server chat Enter-key preference state.
 *
 * @private shared helper for the Agents Server UI
 */
export function useChatEnterBehaviorPreferences() {
    const contextValue = useContext(ChatEnterBehaviorPreferencesContext);

    if (!contextValue) {
        throw new Error(
            '`useChatEnterBehaviorPreferences` must be used inside `ChatEnterBehaviorPreferencesProvider`.',
        );
    }

    return contextValue;
}
