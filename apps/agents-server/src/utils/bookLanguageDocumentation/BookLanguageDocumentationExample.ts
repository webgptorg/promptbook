/**
 * One end-to-end Book language example used in standalone documentation.
 */
export type BookLanguageDocumentationExample = {
    /**
     * Stable identifier used for markdown anchors.
     */
    readonly id: string;

    /**
     * Human-readable example title.
     */
    readonly title: string;

    /**
     * Goal of the example in one short sentence.
     */
    readonly goal: string;

    /**
     * Full Book source shown to readers.
     */
    readonly source: string;

    /**
     * Step-by-step walkthrough of how the source works.
     */
    readonly walkthrough: ReadonlyArray<string>;
};
