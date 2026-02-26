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
import type { ServerTranslationKey } from '../../languages/EnglishServerLanguagePack';
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
    t: (key, variables = {}) => {
        const englishTemplate = getServerLanguagePack(DEFAULT_SERVER_LANGUAGE).translations[key];
        return formatServerTranslationTemplate(englishTemplate, variables);
    },
};

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
};

/**
 * Provides pluggable language packs and one shared translation helper to client UI.
 */
export function ServerLanguageProvider({ children, defaultLanguage }: ServerLanguageProviderProps) {
    const [language, setLanguage] = useState<ServerLanguageCode>(() => resolveServerLanguageCode(defaultLanguage));
    const englishPack = useMemo(() => getServerLanguagePack(DEFAULT_SERVER_LANGUAGE), []);
    const activePack = useMemo(() => getServerLanguagePack(language), [language]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const storedLanguage = window.localStorage.getItem(SERVER_LANGUAGE_STORAGE_KEY);
        if (!storedLanguage) {
            return;
        }

        const resolvedLanguage = resolveServerLanguageCode(storedLanguage);
        setLanguage((currentLanguage) => (currentLanguage === resolvedLanguage ? currentLanguage : resolvedLanguage));
    }, []);

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
            t,
        }),
        [language, t],
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
