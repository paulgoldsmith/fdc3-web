import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: '../../build/coverage-results/ui-provider',
        },
        globals: true,
        environment: 'jsdom',
    },
});
