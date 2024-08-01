module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint'],
    rules: {
        // Note: Indentation is fully managed by Prettier
        // indent: ['error', 4],
        'linebreak-style': ['error', 'unix'],

        // Note: There are places I want to use ${variable} in strings but not using yet
        // quotes: ['error', 'single'],
        semi: ['error', 'always'],
    },
};

/**
 * Note: Emoji in [brackets]
 *
 * - [any emoji] Connects multiple places that are related to each other across the repository
 * - [number] Connects multiple places that are related to each other across the file
 * - [🧠] Marks a place where there is something to decide and think about.
 * - [🔼] Marks an entity (function, class, type,...) that should be exported via an NPM package.
 * - !!! Marks a place that needs to be fixed before releasing a pre-release version.
 * - @@@ Marks a place where text / documentation / ... must be written.
 */
