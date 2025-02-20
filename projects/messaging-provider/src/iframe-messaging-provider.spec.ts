/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

/* eslint @typescript-eslint/no-var-requires: "off" */
import type { BrowserTypes } from '@kite9/fdc3';
import { IProxyOutgoingMessageEnvelope } from '@morgan-stanley/fdc3-web';
import * as fdc3lib from '@morgan-stanley/fdc3-web';
import { Mock, registerMock, reset, setupFunction } from '@morgan-stanley/ts-mocking-bird';
import { IframeMessagingProvider } from './iframe-messaging-provider';

jest.mock('@morgan-stanley/fdc3-web', () =>
    require('@morgan-stanley/ts-mocking-bird').proxyJestModule(require.resolve('@morgan-stanley/fdc3-web')),
);

const mockedRequestUuid = `mocked-generated-uuid`;

describe('IframeMessagingProvider', () => {
    let iframeMessagingProvider: IframeMessagingProvider;
    let mockedDocument: Document;
    let mockedIframe: HTMLIFrameElement;
    let mockIframeLoadedListener: jest.Mock<any, any>;
    let mockWindowMessageListeners: jest.Mock<any, any>[];
    let mockedIframePostMessage: jest.Mock<any, any>;
    let mockedMessageChannel: MessageChannel;
    let mockedConsole: Console;
    let mockedWindow: Window;
    let roundTripNonce: string | undefined;
    let mockedFdc3lib: any;

    beforeAll(() => {
        function channelMock() {}
        channelMock.prototype = {
            port1: {
                onmessage: null,
                start: jest.fn(),
                close: jest.fn(),
                postMessage: jest.fn(),
            },
            port2: {
                onmessage: null,
                postMessage: jest.fn(),
            },
        };
        channelMock.prototype.postMessage = function (data: any) {
            this.onmessage({ data });
        };
        (window as any).MessageChannel = channelMock;
    });

    afterAll(() => {
        reset(fdc3lib);
    });

    beforeEach(() => {
        mockedFdc3lib = Mock.create<typeof fdc3lib>().setup(
            setupFunction('generateUUID', () => mockedRequestUuid),
            setupFunction('discoverProxyCandidates', () => [mockedWindow.parent]),
        );
        registerMock(fdc3lib, mockedFdc3lib.mock);

        roundTripNonce = undefined;
        mockedIframePostMessage = jest.fn();
        mockWindowMessageListeners = [];
        mockedIframe = {
            style: { display: 'none' },
            src: '',
            sandbox: {
                add: jest.fn(),
            },
            contentWindow: {
                postMessage: mockedIframePostMessage,
            },
            addEventListener: jest.fn().mockImplementation((event, listener) => {
                if (event === 'load') {
                    mockIframeLoadedListener = listener;
                }
            }),
        } as any as HTMLIFrameElement;
        mockedDocument = {
            createElement: jest.fn(() => mockedIframe),
            body: {
                appendChild: jest.fn(),
            },
        } as any as Document;
        mockedConsole = jest.mocked(window.console);
        mockedConsole.log = jest.fn();
        mockedWindow = {
            parent: {
                postMessage: jest.fn().mockImplementation((message: any) => {
                    if (message.type === 'hello') {
                        roundTripNonce = message.nonce;
                        for (const mockWindowMessageListener of mockWindowMessageListeners) {
                            mockWindowMessageListener({
                                data: {
                                    type: 'ack',
                                    nonce: roundTripNonce,
                                    url: 'https://mocked-relay-domain.com:1234/context-path/fdc3-iframe-relay/index.html',
                                },
                            });
                        }
                    }
                }),
            },
            removeEventListener: jest.fn(),
            location: {
                href: 'https://mocked-relay-domain.com:1234/context-path/iframe.html',
            },
            addEventListener: jest.fn().mockImplementation((event, listener) => {
                if (event === 'message') {
                    mockWindowMessageListeners.push(listener);
                }
            }),
        } as any as Window;
        mockedMessageChannel = new MessageChannel();
        iframeMessagingProvider = new IframeMessagingProvider(
            5000,
            mockedMessageChannel,
            mockedDocument,
            mockedConsole,
            mockedWindow,
        );
    });

    it('should initialize the relay without an instanceId and generate one', async () => {
        // Arrange
        const iframeMessagingProviderWithoutInstanceId = new IframeMessagingProvider(
            5000,
            mockedMessageChannel,
            mockedDocument,
            mockedConsole,
            mockedWindow,
        );

        // Act
        const relayInitialized = iframeMessagingProviderWithoutInstanceId.initializeRelay();

        // Assert
        expect(mockedWindow.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        expect(mockedWindow.parent.postMessage).toHaveBeenCalledWith(
            {
                type: 'hello',
                nonce: expect.any(String),
            },
            '*',
        );
        expect(mockedIframe.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
        expect(mockedIframe.src).toBe(
            'https://mocked-relay-domain.com:1234/context-path/fdc3-iframe-relay/index.html?channelId=mocked-generated-uuid',
        );

        // Mock the behavior of the iframe loading and the handshake
        mockIframeLoadedListener();
        mockedMessageChannel.port1.onmessage?.({
            data: <BrowserTypes.IframeHandshake>{ type: 'iframeHandshake', payload: { fdc3Version: '2.2' } },
        } as any as MessageEvent);
        await relayInitialized;

        // Assert
        expect(mockedMessageChannel.port1.postMessage).toHaveBeenCalledWith({
            type: 'iframeHello',
            payload: {
                implementationDetails: 'iframe-relay',
            },
        });
    });

    it('should initialize the relay with the correct source and be connected', async () => {
        // Act
        const relayInitialized = iframeMessagingProvider.initializeRelay();

        // Assert
        expect(mockedWindow.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        expect(mockedWindow.parent.postMessage).toHaveBeenCalledWith(
            {
                type: 'hello',
                nonce: expect.any(String),
            },
            '*',
        );
        expect(mockedIframe.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
        expect(mockedIframe.src).toBe(
            'https://mocked-relay-domain.com:1234/context-path/fdc3-iframe-relay/index.html?channelId=mocked-generated-uuid',
        );

        // Mock the behavior of the iframe loading and the handshake
        mockIframeLoadedListener();
        mockedMessageChannel.port1.onmessage?.({
            data: <BrowserTypes.IframeHandshake>{ type: 'iframeHandshake', payload: { fdc3Version: '2.2' } },
        } as any as MessageEvent);
        await relayInitialized;

        // Assert
        expect(mockedMessageChannel.port1.postMessage).toHaveBeenCalledWith({
            type: 'iframeHello',
            payload: {
                implementationDetails: 'iframe-relay',
            },
        });
    });

    it('should fail to initialize the relay if the handshake is not received', () => {
        // Arrange
        jest.useFakeTimers();

        // Act
        const initialized = iframeMessagingProvider.initializeRelay();
        mockIframeLoadedListener();
        jest.advanceTimersByTime(5000);

        // Assert
        expect(initialized).rejects.toEqual('Relay handshake failed. Shutting down relay.');
    });

    it('should shut down the relay by clearing the source', async () => {
        // Act
        iframeMessagingProvider.shutdownRelay();

        // Assert
        expect(mockedIframe.src).toBe('');
        expect(mockedMessageChannel.port1.close).toHaveBeenCalled();
    });

    it('should log an error if the relay is not connected', () => {
        // Arrange
        const message: IProxyOutgoingMessageEnvelope = {
            payload: {
                meta: { requestUuid: '1234', timestamp: new Date() },
                payload: {
                    intent: 'intent',
                },
                type: 'addIntentListenerRequest',
            },
        };
        mockedConsole.error = jest.fn();

        // Act
        iframeMessagingProvider.sendMessage(message);

        // Assert
        expect(mockedConsole.error).toHaveBeenCalledWith('Relay not connected. Cannot publish message.');
    });

    describe('with an initialized relay', () => {
        beforeEach(async () => {
            const relayInitialized = iframeMessagingProvider.initializeRelay();
            mockIframeLoadedListener();
            mockedMessageChannel.port1.onmessage?.({
                data: <BrowserTypes.IframeHandshake>{ type: 'iframeHandshake', payload: { fdc3Version: '2.2' } },
            } as any as MessageEvent);
            await relayInitialized;
        });

        it('should publish a message to the iframe', async () => {
            // Arrange
            const message: IProxyOutgoingMessageEnvelope = {
                payload: {
                    meta: { requestUuid: '1234', timestamp: new Date() },
                    payload: {
                        intent: 'intent',
                    },
                    type: 'addIntentListenerRequest',
                },
            };

            // Act
            iframeMessagingProvider.sendMessage(message);

            // Assert
            expect(mockedMessageChannel.port1.postMessage).toHaveBeenCalledWith(message.payload);
        });

        it('should subscribe to messages received from the iframe message provider', async () => {
            // Arrange
            const callback = jest.fn();
            const message = { data: 'Hello, world!' };

            // Act
            iframeMessagingProvider.addResponseHandler(callback);

            mockedMessageChannel.port1.onmessage?.(message as any as MessageEvent);

            // Assert
            expect(callback).toHaveBeenCalledWith({
                payload: message.data,
            });
        });

        it('should unsubscribe a callback function from receiving messages', async () => {
            // Arrange
            const callback = jest.fn();
            const message = { data: 'Hello, world!' };

            // Act
            iframeMessagingProvider.addResponseHandler(callback);
            iframeMessagingProvider.unsubscribe(callback);

            mockedMessageChannel.port1.onmessage?.(message as any as MessageEvent);

            // Assert
            expect(callback).not.toHaveBeenCalled();
        });

        it('should handle messages received from a child iframe that is creating a DesktopAgent proxy', async () => {
            const source = {
                postMessage: jest.fn(),
            };

            // Act
            for (const mockWindowMessageListener of mockWindowMessageListeners) {
                mockWindowMessageListener(
                    {
                        data: { type: 'hello', nonce: roundTripNonce },
                        source,
                    },
                    '*',
                );
            }

            // Assert
            expect(mockedConsole.log).toHaveBeenCalledWith(
                'Relay connected to iframe with implementation details: 2.2',
            );
            expect(source.postMessage).toHaveBeenCalledWith(
                {
                    type: 'ack',
                    nonce: roundTripNonce,
                    url: 'https://mocked-relay-domain.com:1234/context-path/fdc3-iframe-relay/index.html',
                },
                expect.any(Object),
            );
        });
    });
});
