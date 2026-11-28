'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import {
    DEFAULT_SERVER_LANGUAGE,
    getServerLanguagePack,
    resolveServerLanguageCode,
    SERVER_LANGUAGE_COOKIE_NAME,
    SERVER_LANGUAGE_STORAGE_KEY,
    ServerLanguageRegistry,
    type ServerLanguageCode,
} from '../../languages/ServerLanguageRegistry';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import { formatServerTranslationTemplate } from '../../languages/formatServerTranslationTemplate';
import type { ServerTranslationVariables } from '../../languages/ServerLanguagePack';

/**
 * Context value shared by the server language provider.
 */
type ServerLanguageContextValue = {
    /**
     * Active interface language code.
     */
    readonly language: ServerLanguageCode;
    /**
     * Setter used by language switchers.
     */
    readonly setLanguage: Dispatch<SetStateAction<ServerLanguageCode>>;
    /**
     * Installed language packs that can be selected in the UI.
     */
    readonly availableLanguages: typeof ServerLanguageRegistry;
    /**
     * Indicates whether language overrides are disabled by server metadata.
     */
    readonly isServerLanguageEnforced: boolean;
    /**
     * Resolves one translated message by key with optional template variables.
     */
    readonly t: (key: ServerTranslationKey, variables?: ServerTranslationVariables) => string;
};

/**
 * Default context used before the provider mounts.
 */
const defaultServerLanguageContextValue: ServerLanguageContextValue = {
    language: DEFAULT_SERVER_LANGUAGE,
    setLanguage: (nextLanguage) => {
        void nextLanguage;
    },
    availableLanguages: ServerLanguageRegistry,
    isServerLanguageEnforced: false,
    t: (key, variables = {}) => {
        const englishTemplate = getServerLanguagePack(DEFAULT_SERVER_LANGUAGE).translations[key];
        return formatServerTranslationTemplate(englishTemplate, variables);
    },
};

/**
 * Constant for server language context.
 */
const ServerLanguageContext = createContext<ServerLanguageContextValue>(defaultServerLanguageContextValue);

/**
 * Provider props for the server language context.
 */
type ServerLanguageProviderProps = {
    /**
     * Children that can access translation helpers.
     */
    readonly children: ReactNode;
    /**
     * Default language resolved on the server from metadata/cookies.
     */
    readonly defaultLanguage?: string | null;
    /**
     * When true, language is fixed to the server default and browser overrides are ignored.
     */
    readonly isServerLanguageEnforced?: boolean;
};

/**
 * Provides pluggable language packs and one shared translation helper to client UI.
 */
export function ServerLanguageProvider({
    children,
    defaultLanguage,
    isServerLanguageEnforced = false,
}: ServerLanguageProviderProps) {
    const [language, setLanguageState] = useState<ServerLanguageCode>(() => resolveServerLanguageCode(defaultLanguage));
    const englishPack = useMemo(() => getServerLanguagePack(DEFAULT_SERVER_LANGUAGE), []);
    const activePack = useMemo(() => getServerLanguagePack(language), [language]);

    useEffect(() => {
        if (!isServerLanguageEnforced) {
            return;
        }

        const resolvedDefaultLanguage = resolveServerLanguageCode(defaultLanguage);
        setLanguageState((currentLanguage) =>
            currentLanguage === resolvedDefaultLanguage ? currentLanguage : resolvedDefaultLanguage,
        );
    }, [defaultLanguage, isServerLanguageEnforced]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (isServerLanguageEnforced) {
            return;
        }

        const storedLanguage = window.localStorage.getItem(SERVER_LANGUAGE_STORAGE_KEY);
        if (!storedLanguage) {
            return;
        }

        const resolvedLanguage = resolveServerLanguageCode(storedLanguage);
        setLanguageState((currentLanguage) => (currentLanguage === resolvedLanguage ? currentLanguage : resolvedLanguage));
    }, [isServerLanguageEnforced]);

    const setLanguage = useCallback<Dispatch<SetStateAction<ServerLanguageCode>>>(
        (nextLanguage) => {
            if (isServerLanguageEnforced) {
                return;
            }

            setLanguageState((currentLanguage) => {
                const resolvedNextLanguage = resolveServerLanguageCode(
                    typeof nextLanguage === 'function' ? nextLanguage(currentLanguage) : nextLanguage,
                );
                return currentLanguage === resolvedNextLanguage ? currentLanguage : resolvedNextLanguage;
            });
        },
        [isServerLanguageEnforced],
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(SERVER_LANGUAGE_STORAGE_KEY, language);
        document.cookie = `${SERVER_LANGUAGE_COOKIE_NAME}=${language}; path=/; max-age=31536000; samesite=lax`;
    }, [language]);

    const t = useCallback(
        (key: ServerTranslationKey, variables: ServerTranslationVariables = {}) => {
            const template = activePack.translations[key] || englishPack.translations[key];
            return formatServerTranslationTemplate(template, variables);
        },
        [activePack.translations, englishPack.translations],
    );

    const contextValue = useMemo<ServerLanguageContextValue>(
        () => ({
            language,
            setLanguage,
            availableLanguages: ServerLanguageRegistry,
            isServerLanguageEnforced,
            t,
        }),
        [isServerLanguageEnforced, language, setLanguage, t],
    );

    return <ServerLanguageContext.Provider value={contextValue}>{children}</ServerLanguageContext.Provider>;
}

/**
 * Reads the active server language context.
 *
 * @returns Active language state and translation helper.
 */
export function useServerLanguage() {
    return useContext(ServerLanguageContext);
}
