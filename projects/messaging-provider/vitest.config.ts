import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: '../../build/coverage-results/messaging-provider',
            exclude: [
                '**/dist/**',
                '**/node_modules/**',
                '**/*.d.ts',
                '**/index.ts',
                '**/contracts.ts',
                '**/test.ts',
                // Don't include generated files or definition files
                '**/*.js',
                '**/docs/**',
            ],
        },
        globals: true,
        environment: 'jsdom',
    },
});
