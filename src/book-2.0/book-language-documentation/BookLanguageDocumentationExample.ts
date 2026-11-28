/**
 * One end-to-end Book language example used in standalone documentation.
 *
 * Only the language-neutral Book source lives here. Title, goal, and
 * walkthrough are translated and therefore kept in
 * `BookLanguageManualDictionary.exampleTexts`.
 *
 * @private internal utility of `createStandaloneBookLanguageMarkdown`
 */
export type BookLanguageDocumentationExample = {
    /**
     * Stable identifier used for markdown anchors and translation lookup.
     */
    readonly id: string;

    /**
     * Full Book source shown to readers.
     */
    readonly source: string;
};
