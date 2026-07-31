import type { string_language } from '../../types/string_token';

/**
 * One chapter of the standalone Book language manual.
 *
 * The heading anchors are intentionally **not** part of the dictionary, so deep
 * links stay stable across languages.
 *
 * @private internal type of `createStandaloneBookLanguageMarkdown`
 */
export type BookLanguageManualChapter = {
    /**
     * Translated chapter heading.
     */
    readonly title: string;

    /**
     * Translated chapter body as markdown.
     */
    readonly body: string;
};

/**
 * Translated prose of one end-to-end example.
 *
 * The Book source of an example is language-neutral and therefore stays in
 * `bookLanguageDocumentationExamples`.
 *
 * @private internal type of `createStandaloneBookLanguageMarkdown`
 */
export type BookLanguageManualExampleText = {
    /**
     * Translated example heading.
     */
    readonly title: string;

    /**
     * Translated one-line goal of the example.
     */
    readonly goal: string;

    /**
     * Translated walkthrough steps explaining the example source.
     */
    readonly walkthrough: ReadonlyArray<string>;
};

/**
 * One practical "don't vs do" pitfall item for Book language authoring.
 *
 * @private internal type of `createStandaloneBookLanguageMarkdown`
 */
export type BookLanguageManualPitfall = {
    /**
     * Short pitfall title.
     */
    readonly title: string;

    /**
     * Description of what to avoid.
     */
    readonly dont: string;

    /**
     * Practical corrective action.
     */
    readonly doInstead: string;
};

/**
 * Every translatable string of the standalone Book language manual.
 *
 * Commitment reference bodies are deliberately excluded, because they are the
 * canonical English specification maintained next to each commitment in
 * `src/commitments`.
 *
 * @private internal type of `createStandaloneBookLanguageMarkdown`
 */
export type BookLanguageManualDictionary = {
    /**
     * Language code this dictionary is written in.
     */
    readonly language: string_language;

    /**
     * Manual title used as the top-level heading.
     */
    readonly title: string;

    /**
     * Blockquote lines rendered directly under the manual title.
     */
    readonly introLines: ReadonlyArray<string>;

    /**
     * Labels of the generated manual metadata bullets.
     */
    readonly metadataLabels: {
        readonly bookLanguageVersion: string;
        readonly generatedAt: string;
        readonly commitmentGroups: string;
        readonly implementedCommitments: string;
        readonly placeholderCommitments: string;
    };

    /**
     * Heading of the table of contents.
     */
    readonly tableOfContentsTitle: string;

    /**
     * Chapters rendered in their canonical order.
     */
    readonly chapters: {
        readonly whatIs: BookLanguageManualChapter;
        readonly mentalModel: BookLanguageManualChapter;
        readonly howToStructure: BookLanguageManualChapter;
        readonly primitives: BookLanguageManualChapter;
        readonly commitmentCatalog: BookLanguageManualChapter;
        readonly examples: Pick<BookLanguageManualChapter, 'title'>;
        readonly pitfalls: Pick<BookLanguageManualChapter, 'title'>;
        readonly tutorial: BookLanguageManualChapter;
        readonly lowLevelCommitments: BookLanguageManualChapter;
    };

    /**
     * Sub-sections of the "Mental model of an agent" chapter.
     */
    readonly mentalModelSections: {
        readonly detectedIntro: string;
        readonly detectedProfileLabel: string;
        readonly detectedBehaviorLabel: string;
        readonly detectedToolingLabel: string;
        readonly detectedCompositionLabel: string;
        readonly meta: BookLanguageManualChapter;
        readonly inheritance: BookLanguageManualChapter;
        readonly composition: BookLanguageManualChapter;
        readonly capabilities: BookLanguageManualChapter;
    };

    /**
     * Sub-sections of the "Primitives and constructs reference" chapter.
     */
    readonly primitivesSections: {
        readonly coreSyntax: BookLanguageManualChapter;
        readonly references: BookLanguageManualChapter;
        readonly keywordsTitle: string;
    };

    /**
     * Suffixes distinguishing a server-specific catalog from the portable one.
     */
    readonly commitmentCatalogTitleSuffixes: {
        readonly usedFirst: string;
        readonly all: string;
    };

    /**
     * Labels used in every commitment catalog entry.
     */
    readonly commitmentLabels: {
        readonly status: string;
        readonly aliases: string;
        readonly semantics: string;
        readonly typeSchema: string;
        readonly blockSchema: string;
        readonly lowLevelNotice: string;
        readonly usage: string;
        readonly usageOccurrence: string;
        readonly usageOccurrences: string;
        readonly statusImplemented: string;
        readonly statusPlaceholder: string;
        readonly noAliases: string;
    };

    /**
     * Labels used by end-to-end example sections.
     */
    readonly exampleLabels: {
        readonly commitmentsUsed: string;
        readonly fullSource: string;
        readonly goal: string;
        readonly walkthrough: string;
        readonly noCommitments: string;
    };

    /**
     * Translated prose of the portable examples, keyed by example id.
     */
    readonly exampleTexts: Readonly<Record<string, BookLanguageManualExampleText>>;

    /**
     * Labels used by the "Do nots and common pitfalls" chapter.
     */
    readonly pitfallLabels: {
        readonly dont: string;
        readonly doInstead: string;
    };

    /**
     * Translated pitfall entries.
     */
    readonly pitfalls: ReadonlyArray<BookLanguageManualPitfall>;

    /**
     * Closing parts of the "Build an agent from scratch" chapter.
     */
    readonly tutorialSections: {
        readonly serverAgentsHint: string;
        readonly templateIntro: string;
        readonly checklistTitle: string;
        readonly checklistBody: string;
    };

    /**
     * Closing "Generated from" block of the manual.
     */
    readonly footer: BookLanguageManualChapter;
};
