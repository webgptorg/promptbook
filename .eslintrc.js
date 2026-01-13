module.exports = {
    // Note: Look more at ./CONTRIBUTING.md for more details
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
    plugins: ['@typescript-eslint' /*, 'jest'*/],
    rules: {
        // Note: Indentation is fully managed by Prettier
        // indent: ['error', 4],
        'linebreak-style': ['error', 'unix'],

        // Note: There are places I want to use ${variable} in strings but not using yet
        // quotes: ['error', 'single'],
        semi: ['error', 'always'],
        // 'jest/valid-expect': 'error',

        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        // '@typescript-eslint/no-floating-promises': 'error',

        'no-magic-numbers': [
            'error',
            {
                ignore: [
                    -1,
                    0,
                    1,
                    2, // Note: Semantically distinct - common for binary choice or pairs
                    10, // Note: Semantically distinct - common for base 10 or small offsets
                    60, // Note: Semantically distinct - common for time (seconds/minutes)
                    100, // Note: Semantically distinct - common for percentage
                    1000, // Note: Semantically distinct - common for time (milliseconds)
                ],
            },
        ],
    },
};
