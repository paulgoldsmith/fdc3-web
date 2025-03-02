const path = require('path');
const baseConfig = require('../../jest.config');

const coverageThreshold = {
    global: {
        // thresholds for all files
        statements: 80,
        lines: 80,
        branches: 60,
        functions: 70,
    },
};

module.exports = {
    ...baseConfig,
    coverageThreshold,
    testEnvironment: 'jsdom',
    transformIgnorePatterns: ['node_modules/(?!lit-element|lit-html|lit|@lit/|@finos)'],
    collectCoverageFrom: ['./src/**/*.ts'],
    setupFilesAfterEnv: ['../test.ts'],
    coverageDirectory: path.join('../../build', 'coverage-results', 'ui-provider'),
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: path.join('../../build', 'test-results', 'ui-provider'),
                outputName: 'TESTS.xml',
            },
        ],
        [
            'jest-html-reporters',
            {
                publicPath: path.join('../../build', 'coverage-results', 'ui-provider'),
                pageTitle: 'Testing report',
                inlineSource: true,
            },
        ],
    ],
};
