module.exports = {
    transform: {
        '(jsx?|tsx?)$': 'ts-jest',
    },
    testRegex: '(test)\\.(jsx?|tsx?)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    coverageDirectory: './coverage/',
    collectCoverage: true,
};
