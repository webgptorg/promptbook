module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
        '^.+\\.(js|jsx|mjs)$': 'ts-jest',
    },
    testRegex: '(test)\\.(jsx?|tsx?)$',
    setupFilesAfterEnv: ['./jest.setup.js'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
    coverageDirectory: './coverage/',
    collectCoverage: true,
    testTimeout: 5 /* minutes */ * 60 * 1000,
    transformIgnorePatterns: [
        'node_modules/(?!(@azure|@promptbook|@ai-sdk|@anthropic-ai)/)',
    ],
    extensionsToTreatAsEsm: ['.ts', '.tsx', '.mjs'],
    globals: {
        'ts-jest': {
            useESM: true,
            tsconfig: {
                module: 'esnext',
                target: 'es2020',
                moduleResolution: 'node',
                allowSyntheticDefaultImports: true,
                esModuleInterop: true,
            },
        },
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
