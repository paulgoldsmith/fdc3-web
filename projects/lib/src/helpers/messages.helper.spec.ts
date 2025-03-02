/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import { BrowserTypes } from '@finos/fdc3';
import { IMocked, Mock, proxyJestModule, registerMock, setupFunction } from '@morgan-stanley/ts-mocking-bird';
import { FullyQualifiedAppIdentifier, RequestMessage } from '../contracts';
import { createEvent, createRequestMessage, createResponseMessage } from './messages.helper';
import * as timestampImport from './timestamp.helper';
import * as uuidImport from './uuid.helper';

jest.mock('./uuid.helper', () => proxyJestModule(require.resolve('./uuid.helper')));
jest.mock('./timestamp.helper', () => proxyJestModule(require.resolve('./timestamp.helper')));

type NonOptionalMessage<
    T extends BrowserTypes.AppRequestMessage | BrowserTypes.AgentResponseMessage | BrowserTypes.AgentEventMessage,
> = T & {
    meta: Required<T['meta']>;
};

const mockedGeneratedUuid = `mocked-generated-Uuid`;
const requestUuid = `mocked-requestUuid-Uuid`;
const mockedDate = new Date(2024, 1, 0, 0, 0, 0);

const source: Readonly<FullyQualifiedAppIdentifier> = { appId: 'mockedAppID', instanceId: 'mockedInstanceId' };

describe(`messages.helper`, () => {
    let mockedUuidHelper: IMocked<typeof uuidImport>;
    let mockedTimestampHelper: IMocked<typeof timestampImport>;

    beforeEach(() => {
        mockedUuidHelper = Mock.create<typeof uuidImport>().setup(
            setupFunction('generateUUID', () => mockedGeneratedUuid),
        );
        mockedTimestampHelper = Mock.create<typeof timestampImport>().setup(
            setupFunction('getTimestamp', () => mockedDate),
        );
        registerMock(uuidImport, mockedUuidHelper.mock);
        registerMock(timestampImport, mockedTimestampHelper.mock);
    });

    describe(`createRequestMessage`, () => {
        function testRequestMessageCreation<T extends RequestMessage>(
            type: T['type'],
            payload: T['payload'],
            expected: NonOptionalMessage<T>,
        ) {
            it(`should create expected message of type ${type}`, () => {
                const created = createRequestMessage<T>(type, source, payload);

                expect(created).toEqual(expected);
            });
        }

        testRequestMessageCreation<BrowserTypes.AddContextListenerRequest>(
            'addContextListenerRequest',
            {
                channelId: 'mockedChannelID',
                contextType: 'mocked.context',
            },
            {
                type: 'addContextListenerRequest',
                meta: { source, requestUuid: mockedGeneratedUuid, timestamp: mockedDate },
                payload: {
                    channelId: 'mockedChannelID',
                    contextType: 'mocked.context',
                },
            },
        );

        testRequestMessageCreation<BrowserTypes.RaiseIntentRequest>(
            'raiseIntentRequest',
            {
                context: { type: 'fdc3.expectedContext' },
                intent: 'expectedIntent',
            },
            {
                type: 'raiseIntentRequest',
                meta: { source, requestUuid: mockedGeneratedUuid, timestamp: mockedDate },
                payload: {
                    context: { type: 'fdc3.expectedContext' },
                    intent: 'expectedIntent',
                },
            },
        );
    });

    describe(`createResponseMessage`, () => {
        function testResponseMessageCreation<T extends BrowserTypes.AgentResponseMessage>(
            type: T['type'],
            payload: T['payload'],
            expected: NonOptionalMessage<T>,
        ) {
            it(`should create expected message of type ${type}`, () => {
                const created = createResponseMessage<T>(type, payload, requestUuid, source);

                expect(created).toEqual(expected);
            });
        }

        testResponseMessageCreation<BrowserTypes.AddContextListenerResponse>(
            'addContextListenerResponse',
            { listenerUUID: 'expectedUUid' },
            {
                type: 'addContextListenerResponse',
                meta: {
                    source,
                    requestUuid: requestUuid,
                    timestamp: mockedDate,
                    responseUuid: mockedGeneratedUuid,
                },
                payload: { listenerUUID: 'expectedUUid' },
            },
        );

        testResponseMessageCreation<BrowserTypes.AddContextListenerResponse>(
            'addContextListenerResponse',
            {},
            {
                type: 'addContextListenerResponse',
                meta: {
                    source,
                    requestUuid: requestUuid,
                    timestamp: mockedDate,
                    responseUuid: mockedGeneratedUuid,
                },
                payload: {},
            },
        );

        testResponseMessageCreation<BrowserTypes.RaiseIntentResponse>(
            'raiseIntentResponse',
            { appIntent: { apps: [], intent: { name: 'someIntent' } } },
            {
                type: 'raiseIntentResponse',
                meta: {
                    source,
                    requestUuid: requestUuid,
                    timestamp: mockedDate,
                    responseUuid: mockedGeneratedUuid,
                },
                payload: { appIntent: { apps: [], intent: { name: 'someIntent' } } },
            },
        );
    });

    describe(`createEvent`, () => {
        function testEventCreation<T extends BrowserTypes.AgentEventMessage>(
            type: T['type'],
            payload: T['payload'],
            expected: NonOptionalMessage<T>,
        ) {
            it(`should create expected message of type ${type}`, () => {
                const created = createEvent<T>(type, payload);

                expect(created).toEqual(expected);
            });
        }

        testEventCreation<BrowserTypes.IntentEvent>(
            'intentEvent',
            {
                context: { type: 'example.context' },
                intent: 'startChat',
                raiseIntentRequestUuid: requestUuid,
                originatingApp: source,
            },
            {
                type: 'intentEvent',
                meta: { eventUuid: mockedGeneratedUuid, timestamp: mockedDate },
                payload: {
                    context: { type: 'example.context' },
                    intent: 'startChat',
                    raiseIntentRequestUuid: requestUuid,
                    originatingApp: source,
                },
            },
        );

        testEventCreation<BrowserTypes.BroadcastEvent>(
            'broadcastEvent',
            {
                context: { type: 'fdc3.expectedContext' },
                channelId: 'channelIdOne',
            },
            {
                type: 'broadcastEvent',
                meta: { eventUuid: mockedGeneratedUuid, timestamp: mockedDate },
                payload: {
                    context: { type: 'fdc3.expectedContext' },
                    channelId: 'channelIdOne',
                },
            },
        );
    });
});
