import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: '../../build/coverage-results/lib',
        },
        reporters: ['default', ['html', { outputFile: '../../build/test-results/lib/report.html' }]],
        globals: true,
        environment: 'jsdom',
    },
});
