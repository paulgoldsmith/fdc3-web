const path = require('path');
const prettierConfig = require(path.resolve(__dirname, './prettier.config'));

const additionalIgnorePatterns = process.env.additionalIgnorePatterns;
const overrideIgnorePatterns = process.env.overrideIgnorePatterns;
const optInRules = process.env.optInRules != null ? process.env.optInRules.split(',') : [];

const optInFunctionReturnType = 'explicit-function-return-type';

const ignorePatterns =
    overrideIgnorePatterns != null
        ? overrideIgnorePatterns.split(',')
        : [
            '/dist',
            '/docs',
            '/node_modules',
            ...(additionalIgnorePatterns != null ? additionalIgnorePatterns.split(',') : []),
        ];

const rules = {
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'no-unused-vars': 'off', // typescript already warns about unused but allows some like _someVar
    '@typescript-eslint/no-unused-vars': 'off', // typescript already warns about unused but allows some like _someVar
    '@typescript-eslint/no-explicit-any': 'off', // 'spose... ¯\_(ツ)_/¯
    '@typescript-eslint/explicit-module-boundary-types': 'off', // typescript already warns about unused but allows some like _someVar
    'no-case-declarations': 'off', // prevents declaring variables within a case statement
    '@typescript-eslint/no-inferrable-types': 'off', // forces removal of types for simple assignments like const myVar: string = "someString";
    '@typescript-eslint/no-non-null-assertion': 'off', // allow bangs :'(
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off', // allows bangs at the end of optional chaining :'(
    '@typescript-eslint/explicit-member-accessibility': ['error', { overrides: { constructors: 'no-public' } }], // checks for public / private
    '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }], // warn only about missing return types
    '@typescript-eslint/prefer-as-const': 'off', // we don't really care if a const is marked as a const
    'no-sequences': ['error', { allowInParentheses: false }], // prevents weird multiple expressions separated by comma
    'sort-imports': 'off', // disabled default sorting as we have better option
    'import/no-unresolved': 'off',
    'simple-import-sort/imports': [
        'error',
        {
            groups: [['^\\u0000', '^@?\\w', '^', '^\\.']], // disable blank lines between groups
        },
    ], // alphabetically sorts imports
    'import/no-duplicates': 'error', // removes duplicate imports
    'prettier/prettier': ['error', prettierConfig], // runs prettier
    'header/header':
        [
            'error',
            'block',
            ` Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. `,
            2], // OSS license header
};

if (typeof process.env.BUILD_TYPE === 'string' && process.env.BUILD_TYPE.toLowerCase() === 'release') {
    rules['import/no-cycle'] = 'error';
}

if (optInRules.indexOf(optInFunctionReturnType) >= 0) {
    rules['@typescript-eslint/explicit-function-return-type'] = ['error', { allowExpressions: true }];
}

module.exports = {
    ignorePatterns,
    env: {
        browser: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
    ],
    plugins: [
        'eslint-plugin-prefer-arrow',
        'simple-import-sort',
        'prettier',
        'header'
    ],
    parser: '@typescript-eslint/parser',
    rules,
    overrides: [
        {
            files: ['*.js'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
                '@typescript-eslint/explicit-function-return-type': 'off',
            },
        },
        {
            files: ['*.spec.ts'],
            rules: {
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/ban-types': 'off',
                '@typescript-eslint/explicit-function-return-type': 'off',
            },
        },
        {
            files: ['*.config.js', '*.config.ts'],
            rules: {
                'header/header': 'off',
            },
        },
    ],
};
