module.exports = {
    transform: {
        '(jsx?|tsx?)$': 'ts-jest',
    },
    testRegex: '(test)\\.(jsx?|tsx?)$',
    setupFilesAfterEnv: ['./jest.setup.js'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    coverageDirectory: './coverage/',
    collectCoverage: true,
    testTimeout: 5 /* minutes */ * 60 * 1000,
    // Limit concurrency to reduce ECONNRESET issues with network-heavy tests
    maxWorkers: 1,
    // Prevent test interference
    maxConcurrency: 1,
};
