/**
 * The product promise shared by the CLI's about and help surfaces.
 *
 * @private product presentation
 */
export const PRODUCT_TAGLINE = 'You used to give AI tasks. Now it works for you.';

/**
 * The ownership principle behind Promptbook's local engine.
 *
 * @private product presentation
 */
export const OWNERSHIP_TAGLINE = 'Your AI. On your machine. Under your control.';

/**
 * Concise product introduction for both plain and designed about output.
 *
 * @private product presentation
 */
export const PRODUCT_OVERVIEW: readonly string[] = [
    PRODUCT_TAGLINE,
    'Give Promptbook an ongoing responsibility, a goal and your rules. Its agents identify useful work, carry it through and come back to you when a decision needs you. Your agenda keeps running when you close the dashboard.',
    `${OWNERSHIP_TAGLINE} The engine runs on your computer or server. Agents, tasks and context stay in readable files, with Git history for versioned changes. You choose the supported harnesses and models that do the work.`,
    'This is the self-hosted engine. The upcoming Promptbook app adds convenient control through an end-to-end encrypted relay connection. Visit the website for the app, deployment help and partnerships.',
];

/**
 * Public destinations for learning about the complete product and its engine.
 *
 * @private product presentation
 */
export const PRODUCT_LINKS = {
    website: 'https://www.ptbk.io/en',
    repository: 'https://github.com/webgptorg/promptbook',
} as const;
