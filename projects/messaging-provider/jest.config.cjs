const path = require('path');
const baseConfig = require('../../jest.config');

module.exports = {
    ...baseConfig,
    collectCoverageFrom: ['./src/**/*.ts'],
    setupFilesAfterEnv: ['../test.ts'],
    coverageDirectory: path.join('../../build', 'coverage-results', 'messaging-provider'),
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: path.join('../../build', 'test-results', 'messaging-provider'),
                outputName: 'TESTS.xml',
            },
        ],
        [
            'jest-html-reporters',
            {
                publicPath: path.join('../../build', 'coverage-results', 'messaging-provider'),
                pageTitle: 'Testing report',
                inlineSource: true,
            },
        ],
    ],
};
