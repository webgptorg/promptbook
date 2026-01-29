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
                    3, // Note: Semantically distinct - common for small counts or headings
                    4, // Note: Semantically distinct - common for indentation or small counts
                    5, // Note: Semantically distinct - common for small counts
                    6, // Note: Semantically distinct - common for small counts
                    7, // Note: Semantically distinct - common for small counts
                    8, // Note: Semantically distinct - common for bytes or bits
                    10, // Note: Semantically distinct - common for base 10 or small offsets
                    16, // Note: Semantically distinct - common for hexadecimal
                    20, // Note: Semantically distinct - common for small lengths
                    30, // Note: Semantically distinct - common for small lengths or seconds
                    60, // Note: Semantically distinct - common for time (seconds/minutes)
                    100, // Note: Semantically distinct - common for percentage
                    255, // Note: Semantically distinct - common for color channels
                    256, // Note: Semantically distinct - common for color channels or bytes
                    500, // Note: Semantically distinct - common for HTTP errors or small delays
                    1000, // Note: Semantically distinct - common for time (milliseconds)
                    1024, // Note: Semantically distinct - common for bytes (1KB)
                    120, // Note: Semantically distinct - common for degrees (1/3 of a circle)
                    180, // Note: Semantically distinct - common for degrees (1/2 of a circle)
                    240, // Note: Semantically distinct - common for degrees (2/3 of a circle)
                    300, // Note: Semantically distinct - common for degrees (5/6 of a circle)
                    360, // Note: Semantically distinct - common for degrees (full circle)
                    400, // Note: Semantically distinct - common for HTTP errors or small delays
                    401, // Note: Semantically distinct - common for HTTP errors
                    404, // Note: Semantically distinct - common for HTTP errors
                    410, // Note: Semantically distinct - common for HTTP errors
                    429, // Note: Semantically distinct - common for HTTP errors
                    502, // Note: Semantically distinct - common for HTTP errors
                    503, // Note: Semantically distinct - common for HTTP errors
                    504, // Note: Semantically distinct - common for HTTP errors
                    2000, // Note: Semantically distinct - common for delays (2 seconds)
                    3500, // Note: Semantically distinct - common for delays (3.5 seconds)
                    5000, // Note: Semantically distinct - common for delays (5 seconds)
                    14, // Note: Semantically distinct - common for days or small counts
                    36, // Note: Semantically distinct - common for hashes or small offsets
                    40, // Note: Semantically distinct - common for worktime or small counts
                    50, // Note: Semantically distinct - common for small counts or offsets
                    63, // Note: Semantically distinct - common for base 64 or small offsets
                    186, // Note: Semantically distinct - common for color threshold
                    200, // Note: Semantically distinct - common for small counts or delays
                    800, // Note: Semantically distinct - common for delays
                    1200, // Note: Semantically distinct - common for delays
                    2500, // Note: Semantically distinct - common for delays
                    3000, // Note: Semantically distinct - common for delays
                    60000, // Note: Semantically distinct - common for time (1 minute)
                    65535, // Note: Semantically distinct - common for ports
                    16777215, // Note: Semantically distinct - common for color (0xFFFFFF)
                    1000000, // Note: Semantically distinct - common for pricing (per million)
                    0.1, // Note: Semantically distinct - common for small offsets or ratios
                    0.2126, // Note: Semantically distinct - common for luminance
                    0.299, // Note: Semantically distinct - common for luminance
                    0.5, // Note: Semantically distinct - common for half
                    0.587, // Note: Semantically distinct - common for luminance
                    0.7152, // Note: Semantically distinct - common for luminance
                    0.0722, // Note: Semantically distinct - common for luminance
                    0.114, // Note: Semantically distinct - common for luminance
                    0.9, // Note: Semantically distinct - common for ratios
                    0.95, // Note: Semantically distinct - common for ratios
                    0.01, // Note: Semantically distinct - common for ratios
                    192, // Note: Semantically distinct - common for private IP addresses
                    168, // Note: Semantically distinct - common for private IP addresses
                    172, // Note: Semantically distinct - common for private IP addresses
                    232, // Note: Semantically distinct - common for base 58
                    8192, // Note: Semantically distinct - common for power of 2 or buffer size
                    15, // Note: Semantically distinct - common for small counts or base
                    31, // Note: Semantically distinct - common for hashes or IP masks
                    58, // Note: Semantically distinct - common for base 58
                    201, // Note: Semantically distinct - common for HTTP status
                    768, // Note: Semantically distinct - common for screen width
                ],
                ignoreArrayIndexes: true,
                ignoreDefaultValues: true,
            },
        ],
    },
    overrides: [
        {
            files: ['*.test.ts', '*.test.tsx'],
            rules: {
                'no-magic-numbers': 'off',
            },
        },
        {
            files: ['src/book-components/**/*.tsx'], // Note: Ignore magic numbers in UI components (dimensions, etc.)
            rules: {
                'no-magic-numbers': 'off',
            },
        },
        {
            files: ['**/getTemplatesPipelineCollection.ts'], // Note: Ignore generated vector files
            rules: {
                'no-magic-numbers': 'off',
            },
        },
    ],
};
