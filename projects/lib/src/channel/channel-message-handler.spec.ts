/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import { BrowserTypes, ChannelError, Contact, Context, EventHandler, Listener, PrivateChannel } from '@finos/fdc3';
import {
    any,
    IMocked,
    Mock,
    proxyJestModule,
    registerMock,
    setupFunction,
    setupProperty,
} from '@morgan-stanley/ts-mocking-bird';
import {
    EventListenerLookup,
    EventMessage,
    FullyQualifiedAppIdentifier,
    IProxyMessagingProvider,
    ResponseMessage,
} from '../contracts';
import { IRootPublisher } from '../contracts.internal';
import * as helpersImport from '../helpers';
import { ChannelMessageHandler } from './channel-message-handler';
import { recommendedChannels } from './default-channels';

jest.mock('../helpers', () => proxyJestModule(require.resolve('../helpers')));

const mockedTargetAppId = `mocked-target-app-id`;
const mockedTargetInstanceId = `mocked-target-instance-id`;
const mockedAppIdTwo = `mocked-app-id-two`;
const mockedInstanceIdTwo = `mocked-instance-id-two`;
const mockedAppIdThree = `mocked-app-id-three`;
const mockedInstanceIdThree = `mocked-instance-id-three`;
const mockedRequestUuid = `mocked-request-Uuid`;
const mockedResponseUuid = `mocked-response-Uuid`;
const mockedEventUuid = `mocked-event-Uuid`;
const mockedGeneratedUuid = `mocked-generated-Uuid`;
const mockedDate = new Date(2024, 1, 0, 0, 0, 0);
const mockedChannelId = `mocked-channel-id`;

describe(`${ChannelMessageHandler.name} (channel-message-handler)`, () => {
    let mockRootMessagingProvider: IMocked<IRootPublisher>;
    let mockMessagingProvider: IMocked<IProxyMessagingProvider>;
    let mockedHelpers: IMocked<typeof helpersImport>;

    let source: FullyQualifiedAppIdentifier;
    let sourceTwo: FullyQualifiedAppIdentifier;
    let sourceThree: FullyQualifiedAppIdentifier;

    let contact: Contact;

    beforeEach(() => {
        contact = {
            type: 'fdc3.contact',
            name: 'Joe Bloggs',
            id: {
                username: 'jo_bloggs',
                phone: '079712345678',
            },
        };

        source = { appId: mockedTargetAppId, instanceId: mockedTargetInstanceId };
        sourceTwo = { appId: mockedAppIdTwo, instanceId: mockedInstanceIdTwo };
        sourceThree = { appId: mockedAppIdThree, instanceId: mockedInstanceIdThree };

        mockRootMessagingProvider = Mock.create<IRootPublisher>().setup(
            setupFunction('publishResponseMessage'),
            setupFunction('publishEvent'),
        );

        mockMessagingProvider = Mock.create<IProxyMessagingProvider>().setup(setupFunction('addResponseHandler'));

        mockedHelpers = Mock.create<typeof helpersImport>().setup(
            setupFunction('generateUUID', () => mockedGeneratedUuid),
            setupFunction('getTimestamp', () => mockedDate),
            setupFunction(
                'createRequestMessage',
                (type, source, payload) =>
                    ({
                        type,
                        payload,
                        meta: { requestUuid: mockedRequestUuid, timestamp: mockedDate, source },
                    }) as any,
            ),
            setupFunction(
                'createResponseMessage',
                (type, payload, requestUuid, source) =>
                    ({
                        type,
                        payload,
                        meta: { requestUuid, responseUuid: mockedResponseUuid, timestamp: mockedDate, source },
                    }) as any,
            ),
            setupFunction(
                'createEvent',
                (type, payload) =>
                    ({
                        type,
                        payload,
                        meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                    }) as any,
            ),
        );
        registerMock(helpersImport, mockedHelpers.mock);
    });

    function createInstance(): ChannelMessageHandler {
        return new ChannelMessageHandler(mockRootMessagingProvider.mock);
    }

    it(`should create`, () => {
        const instance = createInstance();
        expect(instance).toBeDefined();
    });

    describe(`getUserChannelsRequest`, () => {
        it(`should publish getUserChannelsResponse`, async () => {
            const instance = createInstance();

            const getUserChannelsRequest: BrowserTypes.GetUserChannelsRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {},
                type: 'getUserChannelsRequest',
            };

            instance.onGetUserChannelsRequest(getUserChannelsRequest, source);

            const expectedMessage: BrowserTypes.GetUserChannelsResponse = {
                type: 'getUserChannelsResponse',
                meta: { ...getUserChannelsRequest.meta, responseUuid: mockedResponseUuid },
                payload: { userChannels: recommendedChannels },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });
    });

    describe(`getCurrentChannelRequest`, () => {
        it(`should publish getCurrentChannelResponse`, async () => {
            const instance = createInstance();

            mockJoinChannel(recommendedChannels[1], instance);

            const getCurrentChannelRequest: BrowserTypes.GetCurrentChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {},
                type: 'getCurrentChannelRequest',
            };

            instance.onGetCurrentChannelRequest(getCurrentChannelRequest, source);

            const expectedMessage: BrowserTypes.GetCurrentChannelResponse = {
                type: 'getCurrentChannelResponse',
                meta: { ...getCurrentChannelRequest.meta, responseUuid: mockedResponseUuid },
                payload: { channel: recommendedChannels[1] },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });
    });

    describe(`joinUserChannelRequest`, () => {
        let eventListeners: EventListenerLookup;

        beforeEach(() => {
            eventListeners = {};
        });

        it(`should add app to specified channel`, async () => {
            const instance = createInstance();

            const joinUserChannelRequest: BrowserTypes.JoinUserChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'joinUserChannelRequest',
            };

            instance.onJoinUserChannelRequest(joinUserChannelRequest, source, eventListeners);

            mockGetCurrentChannel(instance);

            const expectedMessage: BrowserTypes.JoinUserChannelResponse = {
                type: 'joinUserChannelResponse',
                meta: { ...joinUserChannelRequest.meta, responseUuid: mockedResponseUuid },
                payload: {},
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish channelChangedEvent if origin app is listening for them specifically`, async () => {
            const instance = createInstance();

            eventListeners = {
                userChannelChanged: [{ appIdentifier: source, listenerUUID: `mocked-listener-uuid` }],
            };

            const joinUserChannelRequest: BrowserTypes.JoinUserChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'joinUserChannelRequest',
            };

            instance.onJoinUserChannelRequest(joinUserChannelRequest, source, eventListeners);

            const expectedMessage: BrowserTypes.ChannelChangedEvent = {
                type: 'channelChangedEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    newChannelId: recommendedChannels[1].id,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasCalledOnce();
        });

        it(`should publish channelChangedEvent if origin app is listening for all events on channel`, async () => {
            const instance = createInstance();

            eventListeners = {
                allEvents: [{ appIdentifier: source, listenerUUID: `mocked-listener-uuid` }],
            };

            const joinUserChannelRequest: BrowserTypes.JoinUserChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'joinUserChannelRequest',
            };

            instance.onJoinUserChannelRequest(joinUserChannelRequest, source, eventListeners);

            const expectedMessage: BrowserTypes.ChannelChangedEvent = {
                type: 'channelChangedEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    newChannelId: recommendedChannels[1].id,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasCalledOnce();
        });

        it(`should not publish channelChangedEvent if origin app is not listening for them`, async () => {
            const instance = createInstance();

            eventListeners = {};

            const joinUserChannelRequest: BrowserTypes.JoinUserChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'joinUserChannelRequest',
            };

            instance.onJoinUserChannelRequest(joinUserChannelRequest, source, eventListeners);

            const expectedMessage: BrowserTypes.ChannelChangedEvent = {
                type: 'channelChangedEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    newChannelId: recommendedChannels[1].id,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasNotCalled();
        });

        it(`should publish joinUserChannelResponse`, async () => {
            const instance = createInstance();

            const joinUserChannelRequest: BrowserTypes.JoinUserChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'joinUserChannelRequest',
            };

            instance.onJoinUserChannelRequest(joinUserChannelRequest, source, eventListeners);

            const expectedMessage: BrowserTypes.JoinUserChannelResponse = {
                type: 'joinUserChannelResponse',
                meta: { ...joinUserChannelRequest.meta, responseUuid: mockedResponseUuid },
                payload: {},
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });
    });

    describe(`leaveCurrentChannelRequest`, () => {
        let eventListeners: EventListenerLookup;

        beforeEach(() => {
            eventListeners = {};
        });

        it(`should remove app from specified channel`, async () => {
            const instance = createInstance();

            mockJoinChannel(recommendedChannels[1], instance);

            const leaveCurrentChannelRequest: BrowserTypes.LeaveCurrentChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'leaveCurrentChannelRequest',
            };

            instance.onLeaveCurrentChannelRequest(leaveCurrentChannelRequest, source, eventListeners);

            mockGetCurrentChannel(instance);

            const expectedMessage: BrowserTypes.LeaveCurrentChannelResponse = {
                type: 'leaveCurrentChannelResponse',
                meta: { ...leaveCurrentChannelRequest.meta, responseUuid: mockedResponseUuid },
                payload: {},
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish channelChangedEvent if origin app is listening for them specifically`, async () => {
            const instance = createInstance();

            eventListeners = {
                userChannelChanged: [{ appIdentifier: source, listenerUUID: `mocked-listener-uuid` }],
            };

            mockJoinChannel(recommendedChannels[1], instance);

            const leaveCurrentChannelRequest: BrowserTypes.LeaveCurrentChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'leaveCurrentChannelRequest',
            };

            instance.onLeaveCurrentChannelRequest(leaveCurrentChannelRequest, source, eventListeners);

            const expectedMessage: BrowserTypes.ChannelChangedEvent = {
                type: 'channelChangedEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    newChannelId: null,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasCalledOnce();
        });

        it(`should publish channelChangedEvent if origin app is listening for all events on channel`, async () => {
            const instance = createInstance();

            eventListeners = {
                allEvents: [{ appIdentifier: source, listenerUUID: `mocked-listener-uuid` }],
            };

            mockJoinChannel(recommendedChannels[1], instance);

            const leaveCurrentChannelRequest: BrowserTypes.LeaveCurrentChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'leaveCurrentChannelRequest',
            };

            instance.onLeaveCurrentChannelRequest(leaveCurrentChannelRequest, source, eventListeners);

            const expectedMessage: BrowserTypes.ChannelChangedEvent = {
                type: 'channelChangedEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    newChannelId: null,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasCalledOnce();
        });

        it(`should not publish channelChangedEvent if origin app is not listening for them`, async () => {
            const instance = createInstance();

            eventListeners = {};

            mockJoinChannel(recommendedChannels[1], instance);

            const leaveCurrentChannelRequest: BrowserTypes.LeaveCurrentChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'leaveCurrentChannelRequest',
            };

            instance.onLeaveCurrentChannelRequest(leaveCurrentChannelRequest, source, eventListeners);

            const expectedMessage: BrowserTypes.ChannelChangedEvent = {
                type: 'channelChangedEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    newChannelId: null,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasNotCalled();
        });

        it(`should publish leaveCurrentChannelResponse`, async () => {
            const instance = createInstance();

            mockJoinChannel(recommendedChannels[1], instance);

            const leaveCurrentChannelRequest: BrowserTypes.LeaveCurrentChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: recommendedChannels[1].id,
                },
                type: 'leaveCurrentChannelRequest',
            };

            instance.onLeaveCurrentChannelRequest(leaveCurrentChannelRequest, source, eventListeners);

            const expectedMessage: BrowserTypes.LeaveCurrentChannelResponse = {
                type: 'leaveCurrentChannelResponse',
                meta: { ...leaveCurrentChannelRequest.meta, responseUuid: mockedResponseUuid },
                payload: {},
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });
    });

    describe(`privateChannelAddEventListenerRequest`, () => {
        let mockEventHandler: IMocked<{ handler: EventHandler }>;

        beforeEach(() => {
            mockEventHandler = Mock.create<{ handler: EventHandler }>().setup(setupFunction('handler'));
        });

        it(`should publish privateChannelAddEventListenerResponse`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            const privateChannelAddEventListenerMessage: BrowserTypes.PrivateChannelAddEventListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    listenerType: 'disconnect',
                    privateChannelId: 'mocked-generated-Uuid',
                },
                type: 'privateChannelAddEventListenerRequest',
            };

            instance.onPrivateChannelAddEventListenerRequest(privateChannelAddEventListenerMessage, source);

            const expectedMessage: BrowserTypes.PrivateChannelAddEventListenerResponse = {
                type: 'privateChannelAddEventListenerResponse',
                meta: { ...privateChannelAddEventListenerMessage.meta, responseUuid: mockedResponseUuid },
                payload: { listenerUUID: 'mocked-generated-Uuid' },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish privateChannelAddEventListenerResponse with ChannelError.AccessDenied if origin app is not allowed to listen on given private channel`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            const privateChannelAddEventListenerMessage: BrowserTypes.PrivateChannelAddEventListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source: sourceTwo,
                },
                payload: {
                    listenerType: 'disconnect',
                    privateChannelId: 'mocked-generated-Uuid',
                },
                type: 'privateChannelAddEventListenerRequest',
            };

            instance.onPrivateChannelAddEventListenerRequest(privateChannelAddEventListenerMessage, sourceTwo);

            const expectedMessage: BrowserTypes.PrivateChannelAddEventListenerResponse = {
                type: 'privateChannelAddEventListenerResponse',
                meta: { ...privateChannelAddEventListenerMessage.meta, responseUuid: mockedResponseUuid },
                payload: { error: ChannelError.AccessDenied },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, sourceTwo),
            ).wasCalledOnce();
        });

        it(`should pass PrivateChannelEvents to registered handler`, async () => {
            const instance = createInstance();

            const mockPrivateChannel = mockCreatePrivateChannel(instance);

            const listenerPromise = mockPrivateChannel.mock.addEventListener(
                'disconnect',
                mockEventHandler.mock.handler,
            );

            const privateChannelAddEventListenerMessage: BrowserTypes.PrivateChannelAddEventListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    listenerType: 'disconnect',
                    privateChannelId: mockedGeneratedUuid,
                },
                type: 'privateChannelAddEventListenerRequest',
            };

            instance.onPrivateChannelAddEventListenerRequest(privateChannelAddEventListenerMessage, source);

            const expectedMessage: BrowserTypes.PrivateChannelAddEventListenerResponse = {
                meta: { ...privateChannelAddEventListenerMessage.meta, responseUuid: mockedResponseUuid },
                payload: { listenerUUID: 'mocked-generated-Uuid' },
                type: 'privateChannelAddEventListenerResponse',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();

            await postMessage(expectedMessage);

            await listenerPromise;

            const eventMessage: BrowserTypes.PrivateChannelOnDisconnectEvent = {
                meta: {
                    eventUuid: `mocked-event-uuid`,
                    timestamp: mockedDate,
                },
                payload: {
                    privateChannelId: `mocked-channel-id-two`,
                },
                type: 'privateChannelOnDisconnectEvent',
            };

            await postMessage(eventMessage);

            expect(
                mockEventHandler.withFunction('handler').withParametersEqualTo({
                    type: 'disconnect',
                    details: null,
                }),
            ).wasCalledOnce();
        });

        it(`should pass PrivateChannelAddContextListenerEvents for all already added contextListeners to registered handler when eventListener for addContextListener events is added`, async () => {
            const instance = createInstance();

            const mockPrivateChannel = mockCreatePrivateChannel(instance);

            mockAddContextListener(mockedGeneratedUuid, null, source, instance);
            mockAddContextListener(mockedGeneratedUuid, 'fdc3.contact', source, instance);

            const listenerPromise = mockPrivateChannel.mock.addEventListener(
                'addContextListener',
                mockEventHandler.mock.handler,
            );

            const privateChannelAddEventListenerMessage: BrowserTypes.PrivateChannelAddEventListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    listenerType: 'addContextListener',
                    privateChannelId: mockedGeneratedUuid,
                },
                type: 'privateChannelAddEventListenerRequest',
            };

            instance.onPrivateChannelAddEventListenerRequest(privateChannelAddEventListenerMessage, source);

            const expectedMessage: BrowserTypes.PrivateChannelAddEventListenerResponse = {
                meta: { ...privateChannelAddEventListenerMessage.meta, responseUuid: mockedResponseUuid },
                payload: { listenerUUID: 'mocked-generated-Uuid' },
                type: 'privateChannelAddEventListenerResponse',
            };
            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();

            await postMessage(expectedMessage);

            await listenerPromise;

            const expectedEventOne: BrowserTypes.PrivateChannelOnAddContextListenerEvent = {
                meta: {
                    eventUuid: mockedEventUuid,
                    timestamp: mockedDate,
                },
                payload: {
                    contextType: null,
                    privateChannelId: mockedGeneratedUuid,
                },
                type: 'privateChannelOnAddContextListenerEvent',
            };
            expect(
                mockRootMessagingProvider
                    .withFunction('publishEvent')
                    .withParametersEqualTo(expectedEventOne, [source]),
            ).wasCalledOnce();

            const expectedEventTwo: BrowserTypes.PrivateChannelOnAddContextListenerEvent = {
                meta: {
                    eventUuid: mockedEventUuid,
                    timestamp: mockedDate,
                },
                payload: {
                    contextType: 'fdc3.contact',
                    privateChannelId: mockedGeneratedUuid,
                },
                type: 'privateChannelOnAddContextListenerEvent',
            };
            expect(
                mockRootMessagingProvider
                    .withFunction('publishEvent')
                    .withParametersEqualTo(expectedEventTwo, [source]),
            ).wasCalledOnce();

            await postMessage(expectedEventOne);
            await postMessage(expectedEventTwo);

            expect(
                mockEventHandler.withFunction('handler').withParametersEqualTo({
                    type: 'addContextListener',
                    details: { contextType: null },
                }),
            ).wasCalledOnce();

            expect(
                mockEventHandler.withFunction('handler').withParametersEqualTo({
                    type: 'addContextListener',
                    details: { contextType: 'fdc3.contact' },
                }),
            ).wasCalledOnce();
        });
    });

    describe(`privateChannelUnsubscribeEventListenerRequest`, () => {
        it(`should publish privateChannelEventListenerUnsubscribeResponse`, async () => {
            const instance = createInstance();

            const privateChannelAddEventListenerMessage: BrowserTypes.PrivateChannelAddEventListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    listenerType: 'disconnect',
                    privateChannelId: 'mocked-generated-Uuid',
                },
                type: 'privateChannelAddEventListenerRequest',
            };

            instance.onPrivateChannelAddEventListenerRequest(privateChannelAddEventListenerMessage, source);

            const privateChannelUnsubscribeEventListenerRequest: BrowserTypes.PrivateChannelUnsubscribeEventListenerRequest =
                {
                    meta: {
                        requestUuid: mockedRequestUuid,
                        timestamp: mockedDate,
                        source,
                    },
                    payload: { listenerUUID: 'mocked-generated-Uuid' },
                    type: 'privateChannelUnsubscribeEventListenerRequest',
                };

            instance.onPrivateChannelUnsubscribeEventListenerRequest(
                privateChannelUnsubscribeEventListenerRequest,
                source,
            );

            const expectedMessage: BrowserTypes.PrivateChannelUnsubscribeEventListenerResponse = {
                meta: { ...privateChannelUnsubscribeEventListenerRequest.meta, responseUuid: mockedResponseUuid },
                payload: {},
                type: 'privateChannelUnsubscribeEventListenerResponse',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });
    });

    describe(`createPrivateChannelRequest`, () => {
        it(`should publish createPrivateChannelResponse`, async () => {
            const instance = createInstance();

            const createPrivateChannelRequest: BrowserTypes.CreatePrivateChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {},
                type: 'createPrivateChannelRequest',
            };

            instance.onCreatePrivateChannelRequest(createPrivateChannelRequest, source);

            const expectedMessage: BrowserTypes.CreatePrivateChannelResponse = {
                type: 'createPrivateChannelResponse',
                meta: { ...createPrivateChannelRequest.meta, responseUuid: mockedResponseUuid },
                payload: {
                    privateChannel: {
                        id: mockedGeneratedUuid,
                        type: 'private',
                    },
                },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });
    });

    describe(`getOrCreateChannelRequest`, () => {
        it(`should publish getOrCreateChannelResponse with details of channel associated with given channelId if channel exists`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            const getOrCreateChannelRequest: BrowserTypes.GetOrCreateChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedChannelId,
                },
                type: 'getOrCreateChannelRequest',
            };

            instance.onGetOrCreateChannelRequest(getOrCreateChannelRequest, source);

            const expectedMessage: BrowserTypes.GetOrCreateChannelResponse = {
                type: 'getOrCreateChannelResponse',
                meta: { ...getOrCreateChannelRequest.meta, responseUuid: mockedResponseUuid },
                payload: {
                    channel: {
                        id: mockedChannelId,
                        type: 'app',
                    },
                },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalled(2);
        });

        it(`should publish getOrCreateChannelResponse with details of channel created if channel does not exist`, async () => {
            const instance = createInstance();

            const getOrCreateChannelRequest: BrowserTypes.GetOrCreateChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedChannelId,
                },
                type: 'getOrCreateChannelRequest',
            };

            instance.onGetOrCreateChannelRequest(getOrCreateChannelRequest, source);

            const expectedMessage: BrowserTypes.GetOrCreateChannelResponse = {
                type: 'getOrCreateChannelResponse',
                meta: { ...getOrCreateChannelRequest.meta, responseUuid: mockedResponseUuid },
                payload: {
                    channel: {
                        id: mockedChannelId,
                        type: 'app',
                    },
                },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it('should not allow Private Channels to be retrieved using getOrCreateChannel()', () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            const getOrCreateChannelRequest: BrowserTypes.GetOrCreateChannelRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                },
                type: 'getOrCreateChannelRequest',
            };

            instance.onGetOrCreateChannelRequest(getOrCreateChannelRequest, source);

            const expectedMessage: BrowserTypes.GetOrCreateChannelResponse = {
                type: 'getOrCreateChannelResponse',
                meta: { ...getOrCreateChannelRequest.meta, responseUuid: mockedResponseUuid },
                payload: { error: ChannelError.AccessDenied },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });
    });

    describe(`addContextListenerRequest`, () => {
        it(`should publish addContextListenerResponse`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            instance.addToPrivateChannelAllowedList(mockedGeneratedUuid, source);

            const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                    contextType: null,
                },
                type: 'addContextListenerRequest',
            };

            instance.onAddContextListenerRequest(addContextListenerRequest, source);

            const expectedMessage: BrowserTypes.AddContextListenerResponse = {
                type: 'addContextListenerResponse',
                meta: { ...addContextListenerRequest.meta, responseUuid: mockedResponseUuid },
                payload: {
                    listenerUUID: mockedGeneratedUuid,
                },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish addContextListenerResponse with ChannelError.AccessDenied error message if channel is private channel origin app is not allowed to listen on`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source: sourceTwo,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                    contextType: null,
                },
                type: 'addContextListenerRequest',
            };

            instance.onAddContextListenerRequest(addContextListenerRequest, sourceTwo);

            const expectedMessage: BrowserTypes.AddContextListenerResponse = {
                type: 'addContextListenerResponse',
                meta: { ...addContextListenerRequest.meta, responseUuid: mockedResponseUuid },
                payload: { error: ChannelError.AccessDenied },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, sourceTwo),
            ).wasCalledOnce();
        });

        it(`should publish privateChannelOnAddContextListenerEvent if channel is a private channel origin app is allowed to listen on and an app on the channel is listening for that event`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            mockPrivateChannelAddEventListener('addContextListener', mockedGeneratedUuid, source, instance);

            const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                    contextType: null,
                },
                type: 'addContextListenerRequest',
            };

            instance.onAddContextListenerRequest(addContextListenerRequest, source);

            const expectedMessage: BrowserTypes.PrivateChannelOnAddContextListenerEvent = {
                type: 'privateChannelOnAddContextListenerEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    contextType: null,
                    privateChannelId: mockedGeneratedUuid,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasCalledOnce();
        });

        it(`should not publish privateChannelOnAddContextListenerEvent if channel is not private channel`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedChannelId,
                    contextType: null,
                },
                type: 'addContextListenerRequest',
            };

            instance.onAddContextListenerRequest(addContextListenerRequest, source);

            const expectedMessage: BrowserTypes.PrivateChannelOnAddContextListenerEvent = {
                type: 'privateChannelOnAddContextListenerEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    contextType: null,
                    privateChannelId: mockedChannelId,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasNotCalled();
        });

        it(`should not publish privateChannelOnAddContextListenerEvent if channel is a private channel but no app on the channel is listening for that event`, () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                    contextType: null,
                },
                type: 'addContextListenerRequest',
            };

            instance.onAddContextListenerRequest(addContextListenerRequest, source);

            const expectedMessage: BrowserTypes.PrivateChannelOnAddContextListenerEvent = {
                type: 'privateChannelOnAddContextListenerEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    contextType: null,
                    privateChannelId: mockedGeneratedUuid,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasNotCalled();
        });
    });

    describe(`contextListenerUnsubscribeRequest`, () => {
        it(`should publish contextListenerUnsubscribeResponse`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedChannelId,
                    contextType: null,
                },
                type: 'addContextListenerRequest',
            };

            instance.onAddContextListenerRequest(addContextListenerRequest, source);

            const contextListenerUnsubscribeRequest: BrowserTypes.ContextListenerUnsubscribeRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: { listenerUUID: 'mocked-generated-Uuid' },
                type: 'contextListenerUnsubscribeRequest',
            };

            instance.onContextListenerUnsubscribeRequest(contextListenerUnsubscribeRequest, source);

            const expectedMessage: BrowserTypes.ContextListenerUnsubscribeResponse = {
                type: 'contextListenerUnsubscribeResponse',
                meta: { ...contextListenerUnsubscribeRequest.meta, responseUuid: mockedResponseUuid },
                payload: {},
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish privateChannelOnUnsubscribeEvent if channel is a private channel and an app on the channel is listening for that event`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            mockPrivateChannelAddEventListener('unsubscribe', mockedGeneratedUuid, source, instance);

            const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                    contextType: null,
                },
                type: 'addContextListenerRequest',
            };

            instance.onAddContextListenerRequest(addContextListenerRequest, source);

            const contextListenerUnsubscribeRequest: BrowserTypes.ContextListenerUnsubscribeRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: { listenerUUID: 'mocked-generated-Uuid' },
                type: 'contextListenerUnsubscribeRequest',
            };

            instance.onContextListenerUnsubscribeRequest(contextListenerUnsubscribeRequest, source);

            const expectedMessage: BrowserTypes.PrivateChannelOnUnsubscribeEvent = {
                type: 'privateChannelOnUnsubscribeEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    contextType: null,
                    privateChannelId: mockedGeneratedUuid,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasCalledOnce();
        });

        it(`should not publish privateChannelOnUnsubscribeEvent if channel is not private channel`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedChannelId,
                    contextType: null,
                },
                type: 'addContextListenerRequest',
            };

            instance.onAddContextListenerRequest(addContextListenerRequest, source);

            const contextListenerUnsubscribeRequest: BrowserTypes.ContextListenerUnsubscribeRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: { listenerUUID: 'mocked-generated-Uuid' },
                type: 'contextListenerUnsubscribeRequest',
            };

            instance.onContextListenerUnsubscribeRequest(contextListenerUnsubscribeRequest, source);

            const expectedMessage: BrowserTypes.PrivateChannelOnUnsubscribeEvent = {
                type: 'privateChannelOnUnsubscribeEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    contextType: null,
                    privateChannelId: mockedGeneratedUuid,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasNotCalled();
        });

        it(`should not publish privateChannelOnUnsubscribeEvent if channel is a private channel but no app on the channel is listening for that event`, () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                    contextType: null,
                },
                type: 'addContextListenerRequest',
            };

            instance.onAddContextListenerRequest(addContextListenerRequest, source);

            const contextListenerUnsubscribeRequest: BrowserTypes.ContextListenerUnsubscribeRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: { listenerUUID: 'mocked-generated-Uuid' },
                type: 'contextListenerUnsubscribeRequest',
            };

            instance.onContextListenerUnsubscribeRequest(contextListenerUnsubscribeRequest, source);

            const expectedMessage: BrowserTypes.PrivateChannelOnUnsubscribeEvent = {
                type: 'privateChannelOnUnsubscribeEvent',
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    contextType: null,
                    privateChannelId: mockedGeneratedUuid,
                },
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasNotCalled();
        });
    });

    describe(`broadcastRequest`, () => {
        it(`should publish broadcastResponse`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    context: contact,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            instance.onBroadcastRequest(broadcastRequest, source);

            const expectedMessage: BrowserTypes.BroadcastResponse = {
                meta: { ...broadcastRequest.meta, responseUuid: mockedResponseUuid },
                payload: {},
                type: 'broadcastResponse',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish broadcastResponse with ChannelError.AccessDenied error message if channel is private channel origin app is not allowed to broadcast on`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source: sourceTwo,
                },
                payload: {
                    context: contact,
                    channelId: mockedGeneratedUuid,
                },
                type: 'broadcastRequest',
            };

            instance.onBroadcastRequest(broadcastRequest, sourceTwo);

            const expectedMessage: BrowserTypes.BroadcastResponse = {
                type: 'broadcastResponse',
                meta: { ...broadcastRequest.meta, responseUuid: mockedResponseUuid },
                payload: { error: ChannelError.AccessDenied },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, sourceTwo),
            ).wasCalledOnce();
        });

        it(`should publish broadcastResponse with ChannelError.MalformedContext error message if given context is invalid`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    context: `not-a-context` as any,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            instance.onBroadcastRequest(broadcastRequest, source);

            const expectedMessage: BrowserTypes.BroadcastResponse = {
                type: 'broadcastResponse',
                meta: { ...broadcastRequest.meta, responseUuid: mockedResponseUuid },
                payload: { error: ChannelError.MalformedContext },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish broadcastEvent to every app with a contextListener to that channel for the correct contextType, except sourceApp`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            mockAddContextListener(mockedChannelId, 'fdc3.contact', sourceTwo, instance);
            mockAddContextListener(mockedChannelId, null, sourceThree, instance);

            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    context: contact,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            instance.onBroadcastRequest(broadcastRequest, source);

            const expectedMessage: BrowserTypes.BroadcastEvent = {
                meta: { timestamp: mockedDate, eventUuid: mockedEventUuid },
                payload: {
                    channelId: mockedChannelId,
                    context: contact,
                    originatingApp: source,
                },
                type: 'broadcastEvent',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishEvent')
                    .withParametersEqualTo(expectedMessage, [sourceTwo, sourceThree]),
            ).wasCalledOnce();
        });

        it(`should publish broadcastEvent to every app with a contextListener to that channel for the correct contextType, including contextListeners for currentChannel if broadcast channel is current user channel`, async () => {
            const instance = createInstance();

            mockJoinChannel(recommendedChannels[1], instance, sourceTwo);

            mockAddContextListener(null, 'fdc3.contact', sourceTwo, instance);
            mockAddContextListener(recommendedChannels[1].id, null, sourceThree, instance);

            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    context: contact,
                    channelId: recommendedChannels[1].id,
                },
                type: 'broadcastRequest',
            };

            instance.onBroadcastRequest(broadcastRequest, source);

            const expectedMessage: BrowserTypes.BroadcastEvent = {
                meta: { timestamp: mockedDate, eventUuid: mockedEventUuid },
                payload: {
                    channelId: recommendedChannels[1].id,
                    context: contact,
                    originatingApp: source,
                },
                type: 'broadcastEvent',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishEvent')
                    .withParametersEqualTo(expectedMessage, [sourceThree, sourceTwo]),
            ).wasCalledOnce();
        });

        it(`should not deliver broadcastEvent to source app`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            mockAddContextListener(mockedChannelId, 'fdc3.contact', source, instance);

            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    context: contact,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            instance.onBroadcastRequest(broadcastRequest, source);

            const expectedMessage: BrowserTypes.BroadcastEvent = {
                meta: { ...broadcastRequest.meta, eventUuid: mockedEventUuid },
                payload: {
                    channelId: mockedChannelId,
                    context: contact,
                    originatingApp: source,
                },
                type: 'broadcastEvent',
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasNotCalled();
        });

        it(`should not deliver broadcastEvent to apps with contextListeners to channel for a different contextType`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            mockAddContextListener(mockedChannelId, 'fdc3.chart', sourceTwo, instance);

            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    context: contact,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            instance.onBroadcastRequest(broadcastRequest, source);

            const expectedMessage: BrowserTypes.BroadcastEvent = {
                meta: { ...broadcastRequest.meta, eventUuid: mockedEventUuid },
                payload: {
                    channelId: mockedChannelId,
                    context: contact,
                    originatingApp: source,
                },
                type: 'broadcastEvent',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishEvent')
                    .withParametersEqualTo(expectedMessage, [sourceTwo]),
            ).wasNotCalled();
        });
    });

    describe(`getCurrentContextRequest`, () => {
        it(`should publish getCurrentContextResponse containing most recent context broadcast on channel if contextType = null`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            mockBroadcast(mockedChannelId, contact, instance);

            const getCurrentContextRequest: BrowserTypes.GetCurrentContextRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedChannelId,
                    contextType: null,
                },
                type: 'getCurrentContextRequest',
            };

            instance.onGetCurrentContextRequest(getCurrentContextRequest, source);

            const expectedMessage: BrowserTypes.GetCurrentContextResponse = {
                meta: { ...getCurrentContextRequest.meta, responseUuid: mockedResponseUuid },
                payload: {
                    context: contact,
                },
                type: 'getCurrentContextResponse',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish getCurrentContextResponse containing most recent context of correct context type broadcast on channel if contextType is specified`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            mockBroadcast(mockedChannelId, contact, instance);

            const getCurrentContextRequest: BrowserTypes.GetCurrentContextRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedChannelId,
                    contextType: 'fdc3.contact',
                },
                type: 'getCurrentContextRequest',
            };

            instance.onGetCurrentContextRequest(getCurrentContextRequest, source);

            const expectedMessage: BrowserTypes.GetCurrentContextResponse = {
                meta: { ...getCurrentContextRequest.meta, responseUuid: mockedResponseUuid },
                payload: {
                    context: contact,
                },
                type: 'getCurrentContextResponse',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish getCurrentContextResponse containing null if no context has been broadcast on that channel`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            const getCurrentContextRequest: BrowserTypes.GetCurrentContextRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedChannelId,
                    contextType: null,
                },
                type: 'getCurrentContextRequest',
            };

            instance.onGetCurrentContextRequest(getCurrentContextRequest, source);

            const expectedMessage: BrowserTypes.GetCurrentContextResponse = {
                meta: { ...getCurrentContextRequest.meta, responseUuid: mockedResponseUuid },
                payload: {
                    context: null,
                },
                type: 'getCurrentContextResponse',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish getCurrentContextResponse containing null if no context of the specified type has been broadcast on that channel`, async () => {
            const instance = createInstance();

            mockGetOrCreateChannel(mockedChannelId, instance);

            mockBroadcast(mockedChannelId, contact, instance);

            const getCurrentContextRequest: BrowserTypes.GetCurrentContextRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedChannelId,
                    contextType: 'fdc3.chart',
                },
                type: 'getCurrentContextRequest',
            };

            instance.onGetCurrentContextRequest(getCurrentContextRequest, source);

            const expectedMessage: BrowserTypes.GetCurrentContextResponse = {
                meta: { ...getCurrentContextRequest.meta, responseUuid: mockedResponseUuid },
                payload: {
                    context: null,
                },
                type: 'getCurrentContextResponse',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish getCurrentContextResponse with ChannelError.AccessDenied error message if channel is private channel origin app is not allowed to listen on`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            const getCurrentContextRequest: BrowserTypes.GetCurrentContextRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source: sourceTwo,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                    contextType: null,
                },
                type: 'getCurrentContextRequest',
            };

            instance.onGetCurrentContextRequest(getCurrentContextRequest, sourceTwo);

            const expectedMessage: BrowserTypes.GetCurrentContextResponse = {
                type: 'getCurrentContextResponse',
                meta: { ...getCurrentContextRequest.meta, responseUuid: mockedResponseUuid },
                payload: { error: ChannelError.AccessDenied },
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, sourceTwo),
            ).wasCalledOnce();
        });
    });

    describe(`privateChannelDisconnectRequest`, () => {
        it(`should publish privateChannelDisconnectResponse`, async () => {
            const instance = createInstance();

            const privateChannelDisconnectMessage: BrowserTypes.PrivateChannelDisconnectRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                },
                type: 'privateChannelDisconnectRequest',
            };

            instance.onPrivateChannelDisconnectRequest(privateChannelDisconnectMessage, source);

            const expectedMessage: BrowserTypes.PrivateChannelDisconnectResponse = {
                meta: { ...privateChannelDisconnectMessage.meta, responseUuid: mockedResponseUuid },
                payload: {},
                type: 'privateChannelDisconnectResponse',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishResponseMessage')
                    .withParametersEqualTo(expectedMessage, source),
            ).wasCalledOnce();
        });

        it(`should publish privateChannelOnUnsubscribeEvent for every contextListener disconnecting app has for private channel`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            mockAddContextListener(mockedGeneratedUuid, null, source, instance);

            mockPrivateChannelAddEventListener('unsubscribe', mockedGeneratedUuid, source, instance);

            const privateChannelDisconnectMessage: BrowserTypes.PrivateChannelDisconnectRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                },
                type: 'privateChannelDisconnectRequest',
            };

            instance.onPrivateChannelDisconnectRequest(privateChannelDisconnectMessage, source);

            const expectedMessage: BrowserTypes.PrivateChannelOnUnsubscribeEvent = {
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    contextType: null,
                    privateChannelId: mockedGeneratedUuid,
                },
                type: 'privateChannelOnUnsubscribeEvent',
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasCalledOnce();
        });

        it(`should publish privateChannelOnDisconnectEvent if at least one other app on private channel is listening for it`, async () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            instance.addToPrivateChannelAllowedList(mockedGeneratedUuid, sourceTwo);

            mockPrivateChannelAddEventListener('disconnect', mockedGeneratedUuid, sourceTwo, instance);

            const privateChannelDisconnectMessage: BrowserTypes.PrivateChannelDisconnectRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                },
                type: 'privateChannelDisconnectRequest',
            };

            instance.onPrivateChannelDisconnectRequest(privateChannelDisconnectMessage, source);

            const expectedMessage: BrowserTypes.PrivateChannelOnDisconnectEvent = {
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    privateChannelId: mockedGeneratedUuid,
                },
                type: 'privateChannelOnDisconnectEvent',
            };

            expect(
                mockRootMessagingProvider
                    .withFunction('publishEvent')
                    .withParametersEqualTo(expectedMessage, [sourceTwo]),
            ).wasCalledOnce();
        });

        it(`should not publish privateChannelOnDisconnectEvent if no other app on private channel is listening for it`, () => {
            const instance = createInstance();

            mockCreatePrivateChannel(instance);

            const privateChannelDisconnectMessage: BrowserTypes.PrivateChannelDisconnectRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    channelId: mockedGeneratedUuid,
                },
                type: 'privateChannelDisconnectRequest',
            };

            instance.onPrivateChannelDisconnectRequest(privateChannelDisconnectMessage, source);

            const expectedMessage: BrowserTypes.PrivateChannelOnDisconnectEvent = {
                meta: { eventUuid: mockedEventUuid, timestamp: mockedDate },
                payload: {
                    privateChannelId: mockedGeneratedUuid,
                },
                type: 'privateChannelOnDisconnectEvent',
            };

            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParametersEqualTo(expectedMessage, [source]),
            ).wasNotCalled();
        });
    });

    describe(`cleanupDisconnectedProxy`, () => {
        let source: FullyQualifiedAppIdentifier;
        let otherSource: FullyQualifiedAppIdentifier;
        const testContext: Contact = {
            type: 'fdc3.contact',
            name: 'Test Contact',
            id: { email: 'test@example.com' },
        };

        beforeEach(() => {
            // Set up test app identifiers
            source = {
                appId: mockedTargetAppId,
                instanceId: mockedTargetInstanceId,
            };

            otherSource = {
                appId: mockedAppIdTwo,
                instanceId: mockedInstanceIdTwo,
            };
        });

        it(`should not prevent a disconnected proxy from broadcasting to a private channel`, async () => {
            // Create an instance
            const instance = createInstance();

            // Set up a channel and add context from the source app
            const userChannel: BrowserTypes.Channel = {
                id: mockedChannelId,
                type: 'user',
                displayMetadata: {
                    name: 'Test Channel',
                    color: 'red',
                    glyph: 'test',
                },
            };

            // Create the channel
            mockGetOrCreateChannel(mockedChannelId, instance);

            // Join the channel with source app
            mockJoinChannel(userChannel, instance, source);

            // First broadcast should succeed
            const initialBroadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: 'initial-broadcast',
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    context: testContext,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            // Reset the mocks for clean verification
            mockRootMessagingProvider.functionCallLookup.publishResponseMessage = [];
            mockRootMessagingProvider.functionCallLookup.publishEvent = [];

            // Create a new instance with the fresh mock
            const freshInstance = createInstance();

            // Create the channel
            mockGetOrCreateChannel(mockedChannelId, freshInstance);

            // Rejoin the channel
            mockJoinChannel(userChannel, freshInstance, source);

            // Process the broadcast with the fresh instance
            freshInstance.onBroadcastRequest(initialBroadcastRequest, source);

            // Verify successful response was sent before disconnection
            expect(
                mockRootMessagingProvider.withFunction('publishResponseMessage').withParameters(
                    {
                        isExpectedValue: event =>
                            event.type === 'broadcastResponse' && event.payload.error === undefined,
                        expectedDisplayValue: 'Is a broadcastResponse event with no error',
                    },
                    any(),
                ),
            ).wasCalledAtLeastOnce();

            // Now disconnect the proxy
            freshInstance.cleanupDisconnectedProxy(source);

            // Attempt to broadcast after disconnection
            const postDisconnectBroadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: 'post-disconnect-broadcast',
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    context: testContext,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            // Reset the mocks again for post-disconnect verification
            mockRootMessagingProvider.functionCallLookup.publishResponseMessage = [];
            mockRootMessagingProvider.functionCallLookup.publishEvent = [];

            // Create another instance with the fresh mock
            const postDisconnectInstance = createInstance();

            // Create the channel
            mockGetOrCreateChannel(mockedChannelId, postDisconnectInstance);

            // Rejoin the channel (simulating the state after disconnection)
            mockJoinChannel(userChannel, postDisconnectInstance, source);

            // Clean up again since we're using a new instance
            postDisconnectInstance.cleanupDisconnectedProxy(source);

            // Process the broadcast after disconnection with the new instance
            postDisconnectInstance.onBroadcastRequest(postDisconnectBroadcastRequest, source);

            // Find access denied responses (what we expect after disconnect)
            expect(
                mockRootMessagingProvider.withFunction('publishResponseMessage').withParameters(
                    {
                        isExpectedValue: event =>
                            event.type === 'broadcastResponse' && event.payload.error === ChannelError.AccessDenied,
                        expectedDisplayValue: 'Is a broadcastResponse event with AccessDenied error',
                    },
                    any(),
                ),
            ).wasCalledOnce();

            // Find broadcast events (which shouldn't exist after disconnect)
            expect(
                mockRootMessagingProvider.withFunction('publishEvent').withParameters(
                    {
                        isExpectedValue: event => event.type === 'broadcastEvent',
                        expectedDisplayValue: 'Is a broadcastEvent event',
                    },
                    any(),
                ),
            ).wasNotCalled();
        });

        it(`should prevent events from being delivered to a disconnected proxy`, async () => {
            // Create an instance
            const instance = createInstance();

            // Set up a channel
            const userChannel: BrowserTypes.Channel = {
                id: mockedChannelId,
                type: 'user',
                displayMetadata: {
                    name: 'Test Channel',
                    color: 'red',
                    glyph: 'test',
                },
            };

            // Join the channel with both source and otherSource app
            mockJoinChannel(userChannel, instance, source);
            mockJoinChannel(userChannel, instance, otherSource);

            // Add context listeners for both apps
            mockAddContextListener(mockedChannelId, 'fdc3.contact', source, instance);
            mockAddContextListener(mockedChannelId, 'fdc3.contact', otherSource, instance);

            // Store the original event publish function to create a spy
            const originalPublishEvent = mockRootMessagingProvider.mock.publishEvent;
            let sourceReceivedEvent = false;
            let otherSourceReceivedEvent = false;

            // Replace with spy to track who receives broadcast events
            mockRootMessagingProvider.mock.publishEvent = (event, targets) => {
                if (event.type === 'broadcastEvent') {
                    // Check if source is among the targets
                    if (
                        targets.some(target => target.appId === source.appId && target.instanceId === source.instanceId)
                    ) {
                        sourceReceivedEvent = true;
                    }

                    // Check if otherSource is among the targets
                    if (
                        targets.some(
                            target =>
                                target.appId === otherSource.appId && target.instanceId === otherSource.instanceId,
                        )
                    ) {
                        otherSourceReceivedEvent = true;
                    }
                }
                return originalPublishEvent(event, targets);
            };

            // Broadcast from otherSource before disconnection
            const preBroadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: 'pre-disconnect-broadcast',
                    timestamp: mockedDate,
                    source: otherSource,
                },
                payload: {
                    context: testContext,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            // Process the broadcast
            instance.onBroadcastRequest(preBroadcastRequest, otherSource);

            // Before disconnection, both apps should receive events
            expect(sourceReceivedEvent).toBe(true);
            expect(otherSourceReceivedEvent).toBe(true);

            // Now disconnect the source proxy
            instance.cleanupDisconnectedProxy(source);

            // Reset the flags for tracking post-disconnect behavior
            sourceReceivedEvent = false;
            otherSourceReceivedEvent = false;

            // Broadcast from otherSource after disconnection
            const postBroadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: 'post-disconnect-broadcast',
                    timestamp: mockedDate,
                    source: otherSource,
                },
                payload: {
                    context: testContext,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            // Process the broadcast
            instance.onBroadcastRequest(postBroadcastRequest, otherSource);

            // After disconnection, source should not receive events, but otherSource should
            expect(sourceReceivedEvent).toBe(false);
            expect(otherSourceReceivedEvent).toBe(true);
        });

        it(`should allow other apps to continue working after one app is disconnected`, async () => {
            // Create an instance
            const instance = createInstance();

            // Set up a channel
            const userChannel: BrowserTypes.Channel = {
                id: mockedChannelId,
                type: 'user',
                displayMetadata: {
                    name: 'Test Channel',
                    color: 'red',
                    glyph: 'test',
                },
            };

            // Join the channel with both source and otherSource app
            mockJoinChannel(userChannel, instance, source);
            mockJoinChannel(userChannel, instance, otherSource);

            // Add context listeners for both apps
            mockAddContextListener(mockedChannelId, 'fdc3.contact', source, instance);
            mockAddContextListener(mockedChannelId, 'fdc3.contact', otherSource, instance);

            // Disconnect the source proxy
            instance.cleanupDisconnectedProxy(source);

            // Reset the mock for clean verification
            mockRootMessagingProvider.functionCallLookup.publishResponseMessage = [];
            mockRootMessagingProvider.functionCallLookup.publishEvent = [];

            // Broadcast from otherSource after disconnection
            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: 'other-source-broadcast',
                    timestamp: mockedDate,
                    source: otherSource,
                },
                payload: {
                    context: testContext,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            // Process the broadcast
            instance.onBroadcastRequest(broadcastRequest, otherSource);

            // Verify successful response was sent to otherSource
            expect(mockRootMessagingProvider.functionCallLookup.publishResponseMessage?.length).toBeGreaterThan(0);
            const successResponse = mockRootMessagingProvider.functionCallLookup.publishResponseMessage?.[0];
            expect(successResponse).toBeDefined();
            expect(successResponse?.[0].type).toBe('broadcastResponse');
            expect(successResponse?.[0].payload.error).toBeUndefined();
            expect(successResponse?.[1]).toEqual(otherSource);

            // Verify broadcast events were sent to otherSource (still connected)
            const postDisconnectEvents =
                mockRootMessagingProvider.functionCallLookup.publishEvent?.filter(
                    call => call[0].type === 'broadcastEvent',
                ) || [];
            const otherSourceReceivedPostEvent = postDisconnectEvents.some(call => {
                const targets = call[1];
                return targets.some(
                    target => target.appId === otherSource.appId && target.instanceId === otherSource.instanceId,
                );
            });
            expect(otherSourceReceivedPostEvent).toBe(true);
        });

        it(`should make context from disconnected proxy unavailable`, async () => {
            // Create an instance
            const instance = createInstance();

            // Set up a channel
            const userChannel: BrowserTypes.Channel = {
                id: mockedChannelId,
                type: 'user',
                displayMetadata: {
                    name: 'Test Channel',
                    color: 'red',
                    glyph: 'test',
                },
            };

            // Join the channel with source app
            mockJoinChannel(userChannel, instance, source);

            // Add a context to the channel from the source app
            const context: Context = {
                type: 'fdc3.contact',
                name: 'Test Contact',
                id: { email: 'test@example.com' },
                source: source,
            };

            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: mockedRequestUuid,
                    timestamp: mockedDate,
                    source,
                },
                payload: {
                    context,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            // Process the broadcast to add context to the channel
            instance.onBroadcastRequest(broadcastRequest, source);

            // Store the original response function to create a spy
            const originalPublishResponseMessage = mockRootMessagingProvider.mock.publishResponseMessage;
            let contextAvailable = false;

            // Create a spy to track context responses
            mockRootMessagingProvider.mock.publishResponseMessage = (response, target) => {
                if (response.type === 'getCurrentContextResponse') {
                    // Check if this is a context response with non-null context
                    const typedPayload = response.payload as { context: Context | null };
                    contextAvailable = typedPayload.context !== null;
                }
                return originalPublishResponseMessage(response, target);
            };

            // Check context is available before disconnection
            const preGetContextRequest: BrowserTypes.GetCurrentContextRequest = {
                meta: {
                    requestUuid: 'pre-disconnect-get-context',
                    timestamp: mockedDate,
                    source: otherSource,
                },
                payload: {
                    contextType: 'fdc3.contact',
                    channelId: mockedChannelId,
                },
                type: 'getCurrentContextRequest',
            };

            // Get the context before disconnection
            instance.onGetCurrentContextRequest(preGetContextRequest, otherSource);

            // Verify context was available before disconnection
            expect(contextAvailable).toBe(true);

            // Now disconnect the proxy
            instance.cleanupDisconnectedProxy(source);

            // Reset the flag to track what happens after disconnection
            contextAvailable = false;

            // Check context is no longer available after disconnection
            const postGetContextRequest: BrowserTypes.GetCurrentContextRequest = {
                meta: {
                    requestUuid: 'post-disconnect-get-context',
                    timestamp: mockedDate,
                    source: otherSource,
                },
                payload: {
                    contextType: 'fdc3.contact',
                    channelId: mockedChannelId,
                },
                type: 'getCurrentContextRequest',
            };

            // Get the context after disconnection
            instance.onGetCurrentContextRequest(postGetContextRequest, otherSource);

            // Verify context is no longer available after disconnection
            expect(contextAvailable).toBe(false);
        });

        it(`should handle empty collections gracefully`, async () => {
            // Create an instance
            const instance = createInstance();

            // Set up a proxy identifier that hasn't been used
            const unusedProxy: FullyQualifiedAppIdentifier = {
                appId: 'unused-app-id',
                instanceId: 'unused-instance-id',
            };

            // Call the cleanup method without setting up any resources
            expect(() => {
                instance.cleanupDisconnectedProxy(unusedProxy);
            }).not.toThrow();
        });

        it(`should prevent events from being delivered to a disconnected proxy`, async () => {
            // Create an instance
            const instance = createInstance();

            // Set up a channel
            const userChannel: BrowserTypes.Channel = {
                id: mockedChannelId,
                type: 'user',
                displayMetadata: {
                    name: 'Test Channel',
                    color: 'red',
                    glyph: 'test',
                },
            };

            // Join the channel with both source and otherSource app
            mockJoinChannel(userChannel, instance, source);
            mockJoinChannel(userChannel, instance, otherSource);

            // Add context listeners for both apps
            mockAddContextListener(mockedChannelId, 'fdc3.contact', source, instance);
            mockAddContextListener(mockedChannelId, 'fdc3.contact', otherSource, instance);

            // Store the original event publish function to create a spy
            const originalPublishEvent = mockRootMessagingProvider.mock.publishEvent;
            let sourceReceivedEvent = false;
            let otherSourceReceivedEvent = false;

            // Replace with spy to track who receives broadcast events
            mockRootMessagingProvider.mock.publishEvent = (event, targets) => {
                if (event.type === 'broadcastEvent') {
                    // Check if source is among the targets
                    if (
                        targets.some(target => target.appId === source.appId && target.instanceId === source.instanceId)
                    ) {
                        sourceReceivedEvent = true;
                    }

                    // Check if otherSource is among the targets
                    if (
                        targets.some(
                            target =>
                                target.appId === otherSource.appId && target.instanceId === otherSource.instanceId,
                        )
                    ) {
                        otherSourceReceivedEvent = true;
                    }
                }
                return originalPublishEvent(event, targets);
            };

            // Broadcast from otherSource before disconnection
            const preBroadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: 'pre-disconnect-broadcast',
                    timestamp: mockedDate,
                    source: otherSource,
                },
                payload: {
                    context: testContext,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            // Process the broadcast
            instance.onBroadcastRequest(preBroadcastRequest, otherSource);

            // Before disconnection, both apps should receive events
            expect(sourceReceivedEvent).toBe(true);
            expect(otherSourceReceivedEvent).toBe(true);

            // Now disconnect the source proxy
            instance.cleanupDisconnectedProxy(source);

            // Reset the flags for tracking post-disconnect behavior
            sourceReceivedEvent = false;
            otherSourceReceivedEvent = false;

            // Broadcast from otherSource after disconnection
            const postBroadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: 'post-disconnect-broadcast',
                    timestamp: mockedDate,
                    source: otherSource,
                },
                payload: {
                    context: testContext,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            // Process the broadcast
            instance.onBroadcastRequest(postBroadcastRequest, otherSource);

            // After disconnection, source should not receive events, but otherSource should
            expect(sourceReceivedEvent).toBe(false);
            expect(otherSourceReceivedEvent).toBe(true);
        });

        it(`should allow other apps to continue working after one app is disconnected`, async () => {
            // Create an instance
            const instance = createInstance();

            // Set up a channel
            const userChannel: BrowserTypes.Channel = {
                id: mockedChannelId,
                type: 'user',
                displayMetadata: {
                    name: 'Test Channel',
                    color: 'red',
                    glyph: 'test',
                },
            };

            // Join the channel with both source and otherSource app
            mockJoinChannel(userChannel, instance, source);
            mockJoinChannel(userChannel, instance, otherSource);

            // Add context listeners for both apps
            mockAddContextListener(mockedChannelId, 'fdc3.contact', source, instance);
            mockAddContextListener(mockedChannelId, 'fdc3.contact', otherSource, instance);

            // Disconnect the source proxy
            instance.cleanupDisconnectedProxy(source);

            // Reset the mock for clean verification
            mockRootMessagingProvider.functionCallLookup.publishResponseMessage = [];
            mockRootMessagingProvider.functionCallLookup.publishEvent = [];

            // Broadcast from otherSource after disconnection
            const broadcastRequest: BrowserTypes.BroadcastRequest = {
                meta: {
                    requestUuid: 'other-source-broadcast',
                    timestamp: mockedDate,
                    source: otherSource,
                },
                payload: {
                    context: testContext,
                    channelId: mockedChannelId,
                },
                type: 'broadcastRequest',
            };

            // Process the broadcast
            instance.onBroadcastRequest(broadcastRequest, otherSource);

            // Verify successful response was sent to otherSource
            expect(mockRootMessagingProvider.functionCallLookup.publishResponseMessage?.length).toBeGreaterThan(0);
            const successResponse = mockRootMessagingProvider.functionCallLookup.publishResponseMessage?.[0];
            expect(successResponse).toBeDefined();
            expect(successResponse?.[0].type).toBe('broadcastResponse');
            expect(successResponse?.[0].payload.error).toBeUndefined();
            expect(successResponse?.[1]).toEqual(otherSource);

            // Verify broadcast events were sent to otherSource (still connected)
            const postDisconnectEvents =
                mockRootMessagingProvider.functionCallLookup.publishEvent?.filter(
                    call => call[0].type === 'broadcastEvent',
                ) || [];
            const otherSourceReceivedPostEvent = postDisconnectEvents.some(call => {
                const targets = call[1];
                return targets.some(
                    target => target.appId === otherSource.appId && target.instanceId === otherSource.instanceId,
                );
            });
            expect(otherSourceReceivedPostEvent).toBe(true);
        });
    });

    function mockJoinChannel(
        channel: BrowserTypes.Channel,
        instance: ChannelMessageHandler,
        messageSource?: FullyQualifiedAppIdentifier,
    ): void {
        const joinUserChannelRequest: BrowserTypes.JoinUserChannelRequest = {
            type: 'joinUserChannelRequest',
            meta: {
                requestUuid: mockedRequestUuid,
                timestamp: mockedDate,
                source: messageSource ?? source,
            },
            payload: {
                channelId: channel.id,
            },
        };

        const eventListeners: EventListenerLookup = {};

        instance.onJoinUserChannelRequest(joinUserChannelRequest, messageSource ?? source, eventListeners);
    }

    function mockGetCurrentChannel(instance: ChannelMessageHandler): void {
        const getCurrentChannelRequest: BrowserTypes.GetCurrentChannelRequest = {
            meta: {
                requestUuid: mockedRequestUuid,
                timestamp: mockedDate,
                source,
            },
            payload: {},
            type: 'getCurrentChannelRequest',
        };

        instance.onGetCurrentChannelRequest(getCurrentChannelRequest, source);
    }

    function mockGetOrCreateChannel(
        channelId: string,
        instance: ChannelMessageHandler,
    ): BrowserTypes.GetOrCreateChannelResponse {
        const getOrCreateChannelRequest: BrowserTypes.GetOrCreateChannelRequest = {
            meta: {
                requestUuid: mockedRequestUuid,
                timestamp: mockedDate,
                source,
            },
            payload: {
                channelId,
            },
            type: 'getOrCreateChannelRequest',
        };

        instance.onGetOrCreateChannelRequest(getOrCreateChannelRequest, source);

        const expectedMessage: BrowserTypes.GetOrCreateChannelResponse = {
            type: 'getOrCreateChannelResponse',
            meta: { ...getOrCreateChannelRequest.meta, responseUuid: mockedResponseUuid },
            payload: {
                channel: {
                    id: mockedChannelId,
                    type: 'app',
                },
            },
        };

        return expectedMessage;
    }

    function mockAddContextListener(
        channelId: string | null,
        contextType: string | null,
        source: FullyQualifiedAppIdentifier,
        instance: ChannelMessageHandler,
    ): BrowserTypes.AddContextListenerResponse {
        const addContextListenerRequest: BrowserTypes.AddContextListenerRequest = {
            meta: {
                requestUuid: mockedRequestUuid,
                timestamp: mockedDate,
                source,
            },
            payload: {
                channelId,
                contextType,
            },
            type: 'addContextListenerRequest',
        };

        instance.onAddContextListenerRequest(addContextListenerRequest, source);

        const expectedMessage: BrowserTypes.AddContextListenerResponse = {
            type: 'addContextListenerResponse',
            meta: { ...addContextListenerRequest.meta, responseUuid: mockedResponseUuid },
            payload: {
                listenerUUID: mockedGeneratedUuid,
            },
        };

        return expectedMessage;
    }

    function mockBroadcast(
        channelId: string,
        context: Context,
        instance: ChannelMessageHandler,
    ): BrowserTypes.BroadcastResponse {
        const broadcastRequest: BrowserTypes.BroadcastRequest = {
            meta: {
                requestUuid: mockedRequestUuid,
                timestamp: mockedDate,
                source,
            },
            payload: {
                channelId,
                context,
            },
            type: 'broadcastRequest',
        };

        instance.onBroadcastRequest(broadcastRequest, source);

        const expectedMessage: BrowserTypes.BroadcastResponse = {
            type: 'broadcastResponse',
            meta: { ...broadcastRequest.meta, responseUuid: mockedResponseUuid },
            payload: {},
        };

        return expectedMessage;
    }

    function mockPrivateChannelAddEventListener(
        listenerType: BrowserTypes.PrivateChannelEventType,
        privateChannelId: string,
        source: FullyQualifiedAppIdentifier,
        instance: ChannelMessageHandler,
    ): void {
        const privateChannelAddEventListenerMessage: BrowserTypes.PrivateChannelAddEventListenerRequest = {
            meta: {
                requestUuid: mockedRequestUuid,
                timestamp: mockedDate,
                source,
            },
            payload: {
                listenerType,
                privateChannelId,
            },
            type: 'privateChannelAddEventListenerRequest',
        };

        instance.onPrivateChannelAddEventListenerRequest(privateChannelAddEventListenerMessage, source);
    }

    function mockCreatePrivateChannel(instance: ChannelMessageHandler): IMocked<PrivateChannel> {
        const createPrivateChannelRequest: BrowserTypes.CreatePrivateChannelRequest = {
            meta: {
                requestUuid: mockedRequestUuid,
                timestamp: mockedDate,
                source,
            },
            payload: {},
            type: 'createPrivateChannelRequest',
        };

        instance.onCreatePrivateChannelRequest(createPrivateChannelRequest, source);

        return Mock.create<PrivateChannel>().setup(
            setupProperty('id', mockedGeneratedUuid),
            setupFunction('addEventListener', (_, handler) => {
                mockMessagingProvider.mock.addResponseHandler(message => {
                    if (message.payload.type === 'privateChannelOnDisconnectEvent') {
                        handler({ type: 'disconnect', details: null });
                    } else if (message.payload.type === 'privateChannelOnAddContextListenerEvent') {
                        const event = message.payload as BrowserTypes.PrivateChannelOnAddContextListenerEvent;
                        if (event != null) {
                            handler({
                                type: 'addContextListener',
                                details: { contextType: event.payload.contextType },
                            });
                        }
                    }
                });
                return Promise.resolve(Mock.create<Listener>().mock);
            }),
        );
    }

    async function postMessage(message: ResponseMessage | EventMessage): Promise<void> {
        await wait();

        mockMessagingProvider.functionCallLookup.addResponseHandler?.[0][0]({
            payload: message,
        });

        await wait();
    }

    async function wait(delay: number = 50): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => resolve(), delay);
        });
    }
});
