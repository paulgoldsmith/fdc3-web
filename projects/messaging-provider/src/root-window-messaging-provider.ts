/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import {
    generateUUID,
    IRootIncomingMessageEnvelope,
    IRootMessagingProvider,
    IRootOutgoingMessageEnvelope,
    RequestMessage,
} from '@morgan-stanley/fdc3-web';

/**
 * Represents a class that relays messages between the root window and the iframe over the BroadcastChannel API.
 * This class is used to relay messages between the root window and the relay iframe when the parent iframe is hosted on a different domain.
 * The root windows acts as a hub for all messages and relays them to the relay iframe identified by the AppIdentifier.
 */
export class RootWindowMessagingProvider implements IRootMessagingProvider {
    private readonly channels: Map<string, BroadcastChannel> = new Map();
    private readonly newRelayChannel: BroadcastChannel;
    private readonly shutdownRelayChannel: BroadcastChannel;
    private readonly traceMessagingComms;
    private readonly channelId = generateUUID();

    private readonly relayUrl: string;

    private readonly listeners: Array<(message: IRootIncomingMessageEnvelope) => void> = [];

    constructor(
        private readonly channelFactory: (name: string) => BroadcastChannel,
        private readonly consoleRef: Console = window.console,
        private readonly windowRef: Window = window,
    ) {
        this.newRelayChannel = channelFactory('fdc3-iframe-relay-new-channel');
        this.shutdownRelayChannel = channelFactory('fdc3-iframe-relay-shutdown-channel');

        this.newRelayChannel.onmessage = event => {
            if (this.traceMessagingComms) {
                this.consoleRef.log(`[NEWCHANNEL] relay > root: ${JSON.stringify(event.data, null, 2)}`);
            }
            this.createChannel(event.data);
        };
        this.shutdownRelayChannel.onmessage = event => {
            if (this.traceMessagingComms) {
                this.consoleRef.log(`[SHUTDOWNCHANNEL] relay > root: ${JSON.stringify(event.data, null, 2)}`);
            }
            this.shutdownChannel(event.data);
        };

        this.relayUrl = `${this.resolveWindowLocationBasename()}/fdc3-iframe-relay/index.html`;
        this.registerNewDesktopAgentProxyListener();

        const windowSearchParams = this.parseWindowParams(this.windowRef.location.search);
        this.traceMessagingComms = windowSearchParams.traceMessagingComms === 'true';
    }

    private parseWindowParams(search: string): { [key: string]: string } {
        const params = new URLSearchParams(search);
        const result: { [key: string]: string } = {};
        for (const [key, value] of params.entries()) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Resolves the base URL of the window location.
     * @returns the base URL of the window location.
     */
    private resolveWindowLocationBasename(): string {
        const href = this.windowRef.location.href;
        const locationBasename = href.substring(0, href.lastIndexOf('/'));

        if (locationBasename && locationBasename.length > 1) {
            return locationBasename;
        }
        throw new Error('Unable to resolve window location basename');
    }

    /**
     * Responds to the new desktop agent proxy by listening for incoming messages from the desktop agent proxy
     * and responding with a URL to invoke on the iframe messaging provider.
     */
    private registerNewDesktopAgentProxyListener(): void {
        this.windowRef.addEventListener('message', (event: MessageEvent) => {
            if (event.data.type === 'hello' && event.data.nonce !== undefined) {
                const message = {
                    type: 'ack',
                    nonce: event.data.nonce,
                    url: this.relayUrl,
                    traceMessagingComms: this.traceMessagingComms,
                };
                event.source?.postMessage(message, {
                    targetOrigin: event.origin,
                });
            }
        });
    }

    /**
     * Publishes a message to the target app identified by the appIdentifier in the message.
     * @param message containing the appIdentifier of the target app and the payload to be sent.
     */
    public publish(message: IRootOutgoingMessageEnvelope): void {
        // filter out this channel id
        for (const channelId of message.channelIds.filter(channelId => channelId != this.channelId)) {
            const channel = this.channels.get(channelId);
            if (channel == null) {
                this.consoleRef.error(`Channel not found for channelId: ${channelId}`);
            } else {
                (message.payload as any).meta = {
                    ...(message.payload as any).meta,
                    direction: 'from-root',
                };

                channel.postMessage(message.payload);
            }
        }
    }

    /**
     * Subscribes to messages from the FDC3 Desktop Agents
     * @param callback function to be invoked when a message is received
     */
    public subscribe(callback: (message: IRootIncomingMessageEnvelope) => void): void {
        this.listeners.push(callback);
    }

    /**
     * Creates a new channel for the given appIdentifier.
     */
    private createChannel(channelId: string): void {
        const channel = this.channelFactory(channelId);
        channel.onmessage = message => this.onMessage(message, channelId);
        this.channels.set(channelId, channel);
        this.consoleRef.log(`Created channel in root window for channelId: ${channelId}`);
        channel.postMessage({
            type: 'broadcastChannelReady',
            meta: {
                direction: 'from-root',
            },
        });
    }

    /**
     * Relays a message from the source app to the destination app through the root window given the AppIdentifier in the message.
     */
    private onMessage(event: MessageEvent, channelId: string): any {
        // Ignore messages that are sent from the root window to the iframe.
        if (event.data?.meta?.direction === 'from-root') {
            return;
        }
        // Remove the direction meta data before sending the message to the iframe relay.
        if (event.data?.meta?.direction === 'to-root') {
            delete event.data.meta.direction;
        }
        if (this.traceMessagingComms) {
            this.consoleRef.log(`[MESSAGE] relay > root: ${JSON.stringify(event.data, null, 2)}`);
        }

        const message = event.data as RequestMessage;
        this.passMessageToListeners(message, channelId);
    }

    private passMessageToListeners(message: RequestMessage, channelId: string): void {
        this.listeners.forEach(listener => listener({ payload: message, channelId }));
    }

    /**
     * Shuts down the channel for the given appIdentifier.
     */
    private shutdownChannel(channelId: string): void {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.close();
            this.channels.delete(channelId);
        }
    }
}
