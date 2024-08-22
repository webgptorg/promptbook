module.exports = {
    // Note: Look more at ./PROGRAMMING.md for more details
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
