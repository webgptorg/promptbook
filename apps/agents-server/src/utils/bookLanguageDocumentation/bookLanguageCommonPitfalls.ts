/**
 * One practical "don't vs do" pitfall item for Book language authoring.
 */
export type BookLanguageCommonPitfall = {
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
 * Common anti-patterns with practical fixes.
 */
export const bookLanguageCommonPitfalls: ReadonlyArray<BookLanguageCommonPitfall> = [
    {
        title: 'Too broad agent scope',
        dont: 'One agent tries to be a lawyer, developer, marketer, and researcher at once.',
        doInstead: 'Split into focused agents and orchestrate with TEAM or IMPORT.',
    },
    {
        title: 'Unverifiable claims',
        dont: 'The agent answers internet-dependent questions without tools or without citing sources.',
        doInstead: 'Add `USE SEARCH ENGINE` / `USE BROWSER` and a citation-oriented `RULE`.',
    },
    {
        title: 'Missing guardrails',
        dont: 'Only persona is defined, with no behavioral constraints.',
        doInstead: 'Add concrete `RULE` commitments for safety, scope, and tone.',
    },
    {
        title: 'Overloaded inheritance',
        dont: 'Using deep `FROM` chains without documenting why each parent is needed.',
        doInstead: 'Keep inheritance shallow and use focused IMPORT/TEAM composition for reuse.',
    },
    {
        title: 'Unsafe memory usage',
        dont: 'Storing every detail in memory without boundaries.',
        doInstead: 'Pair `MEMORY` with explicit rules about what is allowed to persist.',
    },
];
