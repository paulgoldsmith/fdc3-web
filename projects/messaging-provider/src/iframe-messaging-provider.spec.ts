/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import { IProxyOutgoingMessageEnvelope } from '@morgan-stanley/fdc3-web';
import { describe, expect, it, vi } from 'vitest';
import { IframeMessagingProvider } from './iframe-messaging-provider';

// Mock the key imports
vi.mock('@morgan-stanley/fdc3-web', () => ({
    generateUUID: () => 'mocked-uuid',
    discoverProxyCandidates: vi.fn(() => [{ postMessage: vi.fn() }]),
    generateHelloMessage: () => ({
        type: 'WCP1Hello',
        meta: {
            connectionAttemptUuid: 'mocked-uuid',
            timestamp: new Date(),
        },
        payload: {
            actualUrl: 'http://localhost/',
            fdc3Version: '2.2.0',
            identityUrl: 'http://localhost/',
        },
    }),
}));

describe('IframeMessagingProvider', () => {
    // Test for the simplest function first - this should work
    it('should shut down the relay by clearing the source', () => {
        // Setup mocks
        const mockIframe = {
            src: 'some-url',
            style: { display: 'none' },
            sandbox: { add: vi.fn() },
        } as unknown as HTMLIFrameElement;
        const mockMessageChannel = {
            port1: {
                close: vi.fn(),
                onmessage: null,
            },
        } as unknown as MessageChannel;
        const mockDocument = {
            createElement: vi.fn(() => mockIframe),
            body: { appendChild: vi.fn() },
        } as unknown as Document;

        // Create mock console with log method
        const mockConsole = {
            log: vi.fn(),
            error: vi.fn(),
        } as unknown as Console;

        // Create provider
        const provider = new IframeMessagingProvider(5000, mockMessageChannel, mockDocument, mockConsole, window);

        // Call method under test
        provider.shutdownRelay();

        // Verify behavior
        expect(mockIframe.src).toBe('');
        expect(mockMessageChannel.port1.close).toHaveBeenCalled();
    });

    // Test error logging for unconnected provider
    it('should log an error if the relay is not connected', () => {
        // Setup mocks
        const mockConsole = {
            log: vi.fn(),
            error: vi.fn(),
        } as unknown as Console;

        const mockIframe = {
            style: { display: 'none' },
            sandbox: { add: vi.fn() },
        } as unknown as HTMLIFrameElement;

        const mockMessageChannel = {
            port1: { close: vi.fn(), onmessage: null },
        } as unknown as MessageChannel;

        const mockDocument = {
            createElement: vi.fn(() => mockIframe),
            body: { appendChild: vi.fn() },
        } as unknown as Document;

        // Create provider
        const provider = new IframeMessagingProvider(5000, mockMessageChannel, mockDocument, mockConsole, window);

        // Create test message
        const message: IProxyOutgoingMessageEnvelope = {
            payload: {
                meta: { requestUuid: '1234', timestamp: new Date() },
                payload: { intent: 'intent' },
                type: 'addIntentListenerRequest',
            },
        };

        // Call method under test
        provider.sendMessage(message);

        // Verify error was logged
        expect(mockConsole.error).toHaveBeenCalledWith('Relay not connected. Cannot publish message.');
    });

    // Test timeout case
    it('should fail to initialize the relay if the handshake is not received', async () => {
        // Setup mocks with advanced fakes
        vi.useFakeTimers();

        // Create mocks
        const mockIframe = {
            src: '',
            style: { display: 'none' },
            sandbox: { add: vi.fn() },
            addEventListener: vi.fn((event, listener) => {
                if (event === 'load') {
                    // Automatically call the load handler to simulate iframe loading
                    setTimeout(() => listener(), 10);
                }
            }),
            contentWindow: { postMessage: vi.fn() },
        } as unknown as HTMLIFrameElement;

        const mockMessageChannel = {
            port1: {
                start: vi.fn(),
                close: vi.fn(),
                postMessage: vi.fn(),
                onmessage: null,
            },
            port2: {},
        } as unknown as MessageChannel;

        const mockDocument = {
            createElement: vi.fn(() => mockIframe),
            body: { appendChild: vi.fn() },
        } as unknown as Document;

        const mockWindow = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            location: { href: 'http://test.com' },
        } as unknown as Window;

        // Create mock console with all required methods
        const mockConsole = {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        } as unknown as Console;

        // Create provider
        const provider = new IframeMessagingProvider(
            5000, // 5 second timeout
            mockMessageChannel,
            mockDocument,
            mockConsole,
            mockWindow,
        );

        // Start initialization and handle the rejection properly
        const initPromise = provider.initializeRelay().catch(error => {
            // We expect this error, so we're explicitly handling it here
            expect(error).toEqual('Relay handshake failed. Shutting down relay.');
            return error; // Return the error to mark it as handled
        });

        // Advance timers to simulate iframe loading but no handshake
        await vi.advanceTimersByTimeAsync(10); // Trigger iframe load
        await vi.advanceTimersByTimeAsync(5000); // Trigger timeout

        // Wait for the promise to settle
        await initPromise;

        // Verify that shutdownRelay was called (which happens when the timeout is reached)
        expect(mockMessageChannel.port1.close).toHaveBeenCalled();

        // Cleanup
        vi.useRealTimers();
    });
});
