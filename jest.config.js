const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

const coverageThreshold = {
    global: {
        // thresholds for all files
        statements: 80,
        lines: 80,
        branches: 80,
        functions: 80,
    },
};

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    moduleFileExtensions: ['js', 'json', 'ts'],
    testEnvironment: 'jsdom',
    collectCoverage: true,
    moduleNameMapper: {
        //https://stackoverflow.com/questions/49263429/jest-gives-an-error-syntaxerror-unexpected-token-export
        '^uuid$': require.resolve('uuid'),
        ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/../../' } )
    },
    transformIgnorePatterns: [],
    transform: {
        '^.+\\.(ts|tsx)?$': 'ts-jest',
        '^.+\\.(js|jsx)$': 'babel-jest',
    },
    clearMocks: true,
    coverageThreshold,
    modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/../test.ts'],
};
