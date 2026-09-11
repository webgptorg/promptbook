/**
 * Claims the hero headline rotates through.
 *
 * Note: This is the single source of truth for every hero claim - the rotating headline, the page tagline
 *       and the sharing image all read them from here, specified in
 *       [`specs/sections/hero.md`](../../specs/sections/hero.md)
 */

/**
 * One claim the hero headline rotates through, split into the two lines it is set in.
 */
export type HeroClaim = {
    /**
     * First line of the claim, set in white.
     */
    readonly leadLine: string;

    /**
     * Second line of the claim, set in the Promptbook Blue to Promptbook Green gradient.
     */
    readonly accentLine: string;
};

/**
 * Every claim the hero headline rotates through, in the order they take over the headline.
 */
export const HERO_CLAIMS: ReadonlyArray<HeroClaim> = [
    {
        leadLine: 'Your coding agents,',
        accentLine: 'running your backlog.',
    },
    {
        leadLine: 'Focus on what matters,',
        accentLine: 'automate the rest.',
    },
    {
        leadLine: "You shouldn't",
        accentLine: 'babysit your backlog.',
    },
    {
        leadLine: 'Ship a backlog,',
        accentLine: 'not a stream of interruptions.',
    },
    {
        leadLine: 'Let your coding agents',
        accentLine: 'handle the rest.',
    },
    {
        leadLine: 'Automate your coding,',
        accentLine: 'focus on what truly matters.',
    },
    {
        leadLine: 'Let your coding agents',
        accentLine: 'take care of the mundane tasks.',
    },
];

/**
 * Claim which opens the rotation and represents the page everywhere the headline itself does not fit -
 * the page title, the tagline and the sharing image.
 */
export const PRIMARY_HERO_CLAIM: HeroClaim = HERO_CLAIMS[0];
