import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: '../../build/coverage-results/ui-provider',
            include: ['src/**/*.{ts,tsx}'],
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
        reporters: ['default'],
        globals: true,
        environment: 'jsdom',
    },
});
