/**
 * Directories containing the repository's unit tests.
 */
const TEST_ROOTS = [
    '<rootDir>/src',
    '<rootDir>/apps/agents-server/src',
    '<rootDir>/apps/agents-server/scripts',
    '<rootDir>/apps/utils/src',
    '<rootDir>/scripts',
    '<rootDir>/book',
];

module.exports = {
    // Keep Jest's filesystem crawl limited to directories that contain unit tests.
    roots: TEST_ROOTS,
    transform: {
        // Type checking is already performed once by `npm run test-types`; unit tests only need transpilation.
        '(jsx?|tsx?)$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.jest.json',
                isolatedModules: true,
                diagnostics: false,
            },
        ],
        '\\.ya?ml$': '<rootDir>/jest.yamlRawTransformer.js',
    },
    testRegex: '(test)\\.(jsx?|tsx?)$',
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/\\.promptbook/', '<rootDir>/\\.tmp/'],
    setupFilesAfterEnv: ['./jest.setup.js'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'yaml', 'yml', 'node'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/apps/agents-server/$1',
        '^@common/(.*)$': '<rootDir>/apps/_common/$1',
        '^@promptbook-local/(.*)$': '<rootDir>/src/_packages/$1.index',
        '\\.(css|less|sass|scss)$': '<rootDir>/jest.styleMock.js',
        '^(.*\\.ya?ml)\\?raw$': '$1',
    },
    coverageDirectory: './coverage/',
    collectCoverage: false,
    testTimeout: 5 /* minutes */ * 60 * 1000,
    // Keep a small amount of parallelism without overloading network-heavy tests.
    maxWorkers: 2,
    // Prevent test interference
    maxConcurrency: 1,
};
