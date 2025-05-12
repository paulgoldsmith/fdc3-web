import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: './build/coverage-results',
            exclude: [
                '**/vitest.config.ts',
                '**/webpack.config.ts',
                '**/eslint.config.mjs',
                '**/dist/**',
                '**/node_modules/**',
                '**/*.d.ts',
                '**/index.ts',
                '**/contracts.ts',
                '**/test.ts',
                '**/test-harness/**',
                // Don't include generated files or definition files
                '**/*.js',
                '**/docs/**',
            ],
        },
        globals: true,
        environment: 'jsdom',
    },
    resolve: {
        alias: [
            { find: '@fdc3', replacement: resolve(__dirname, './projects/lib/src') },
            { find: /^projects\/lib\/src\/(.*)$/, replacement: resolve(__dirname, './projects/lib/src/$1') },
        ],
    },
    // Improve module resolution for test files
    server: {
        watch: {
            ignored: ['**/node_modules/**', '**/dist/**'],
        },
    },
});
