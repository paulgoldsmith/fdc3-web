/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import type { BrowserTypes } from '@kite9/fdc3';

/**
 * Represents a relay for communication between this iframe, the parent window and the root window using the Broadcast Channel API.
 */
export class IframeRelay {
    private readonly rootWindowBroadcastChannel: BroadcastChannel;
    private relayMessagePort: MessagePort | undefined;
    private readonly channelId: string;

    constructor(
        private readonly windowRef: Window = window,
        private readonly consoleRef: Console = window.console,
        private readonly traceMessagingComms = true,
    ) {
        const queryParams = new URLSearchParams(windowRef.location.search);
        this.channelId = queryParams.get('channelId') || '';

        if (!this.channelId) {
            throw new Error('iFrameRelay: channelId not found in the query parameters.');
        }

        this.rootWindowBroadcastChannel = new BroadcastChannel(this.channelId);

        if (traceMessagingComms) {
            consoleRef.log(`Iframe relay created with channelId: '${this.channelId}'`);
        }
    }

    /**
     * Initializes the relay for message communication between the iframe, its parent window and the BroadcastChannel to the root window.
     */
    public initializeRelay(): void {
        // The newRelayChannel is used to notify the root window that a new relay channel has been created and inform it of the appIdentifier.
        if (this.traceMessagingComms) {
            this.consoleRef.log(`Sending new channel request for ${this.channelId}.`);
        }
        const newRelayChannel = new BroadcastChannel('fdc3-iframe-relay-new-channel');
        newRelayChannel.postMessage(this.channelId);

        let broadcastChannelReadyResolve: () => void;
        const broadcastChannelReady = new Promise<void>(resolve => {
            broadcastChannelReadyResolve = resolve;
        });

        // Handler to initialize the relay message port. When a message is received with the port2, it is stored and used to relay messages to the parent window.
        const messagePortIntializeHandler = (event: MessageEvent): any => {
            this.relayMessagePort = event.ports?.[0];
            if (this.relayMessagePort !== undefined) {
                this.relayMessagePort.onmessage = (...args) =>
                    this.parentOnMessage.call(this, ...args, broadcastChannelReady);
                // Remove the event listener after the message port has been initialized.
                this.windowRef.removeEventListener('message', messagePortIntializeHandler);
            } else {
                this.consoleRef.error('Relay message port not found in the event data.');
            }
        };
        this.windowRef.addEventListener('message', messagePortIntializeHandler);

        // Handler to relay messages from the root window to the parent window.
        this.rootWindowBroadcastChannel.onmessage = (event: MessageEvent<any>) => {
            // Ignore messages that are sent from the root window to the iframe.
            if (event.data?.meta?.direction === 'to-root') {
                return;
            }
            // Remove the direction meta data before sending the message to the parent window.
            if (event.data?.meta?.direction === 'from-root') {
                delete event.data.meta.direction;
            }
            if (event.data?.type === 'broadcastChannelReady') {
                this.consoleRef.log(`Broadcast channel ready message received for ${this.channelId}.`);
                broadcastChannelReadyResolve();
            } else if (this.relayMessagePort !== undefined) {
                if (this.traceMessagingComms) {
                    this.consoleRef.log(`[MESSAGE] root > iframe: ${JSON.stringify(event.data, null, 2)}`);
                }
                this.relayMessagePort.postMessage(event.data);
            } else {
                this.consoleRef.error('Relay message port not initialized yet.');
            }
        };
    }

    /**
     * Handles the message event from the relay channel.
     * @param event
     */
    private async parentOnMessage(event: MessageEvent<any>, broadcastChannelReady: Promise<void>): Promise<void> {
        if (event.data.type === 'fdc3-shutdown-channel') {
            // Special message type to shutdown the relay channel.
            this.consoleRef.log(`Shutting down relay channel: ${this.channelId}`);
            const shutdownRelayChannel = new BroadcastChannel('fdc3-iframe-relay-shutdown-channel');
            shutdownRelayChannel.postMessage(this.channelId);
        } else if (event.data.type === 'iframeHello') {
            this.relayMessagePort?.postMessage(<BrowserTypes.IframeHandshake>{
                type: 'iframeHandshake',
                payload: {
                    fdc3Version: '2.2',
                },
            });
        } else {
            if (this.traceMessagingComms) {
                this.consoleRef.log(`[MESSAGE] parent > relay: ${JSON.stringify(event.data, null, 2)}`);
            }
            // Wait for the next microtask to ensure the BroadcastChannel is ready to post messages in the root window.
            await broadcastChannelReady;
            event.data.meta = {
                ...event.data.meta,
                direction: 'to-root',
            };
            this.rootWindowBroadcastChannel.postMessage(event.data);
        }
    }
}
