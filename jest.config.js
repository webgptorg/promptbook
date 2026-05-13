module.exports = {
    transform: {
        '(jsx?|tsx?)$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
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
    collectCoverage: true,
    testTimeout: 5 /* minutes */ * 60 * 1000,
    // Limit concurrency to reduce ECONNRESET issues with network-heavy tests
    maxWorkers: 1,
    // Prevent test interference
    maxConcurrency: 1,
};
