import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: '../../build/coverage-results/ui-provider',
        },
        reporters: ['default', ['html', { outputFile: '../../build/test-results/ui-provider/report.html' }]],
        globals: true,
        environment: 'jsdom',
    },
});
