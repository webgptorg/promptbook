/**
 * Variables interpolated into language templates.
 */
export type ServerTranslationVariables = Readonly<Record<string, string | number>>;

/**
 * Pluggable translation pack used by the Agents Server UI.
 */
export type ServerLanguagePack<TTranslationKey extends string> = {
    /**
     * Stable language code used in metadata and persisted preferences.
     */
    readonly language: string;
    /**
     * English-readable language label.
     */
    readonly englishName: string;
    /**
     * Native label shown in language selectors.
     */
    readonly nativeName: string;
    /**
     * Key-value translation catalog for this language pack.
     */
    readonly translations: Readonly<Record<TTranslationKey, string>>;
};
