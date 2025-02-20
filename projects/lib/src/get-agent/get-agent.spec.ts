/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import { DesktopAgent, GetAgentParams } from '@kite9/fdc3';
import { Mock, setupFunction } from '@morgan-stanley/ts-mocking-bird';
import { getAgent, resetCachedPromise } from './get-agent';

describe(`getAgent`, () => {
    let mockAgent: DesktopAgent;

    beforeEach(() => {
        mockAgent = Mock.create<DesktopAgent>().mock;
    });

    afterEach(() => {
        (window as any).fdc3 = undefined;

        resetCachedPromise();
    });

    it(`should return same promise if called twice`, async () => {
        const promiseOne = getAgent();
        const promiseTwo = getAgent();

        expect(promiseOne).toStrictEqual(promiseTwo);

        await promiseOne.catch(() => {
            return undefined;
        });

        await promiseTwo.catch(() => {
            return undefined;
        });
    });

    it(`should return instance at window.fdc3 if it exists`, async () => {
        window.fdc3 = mockAgent;

        const agent = await getAgent();

        expect(agent).toBe(mockAgent);
    });

    it(`should invoke the fallback if one is provided`, async () => {
        const mockParams = Mock.create<GetAgentParams>().setup(
            setupFunction('failover', () => Promise.resolve(mockAgent)),
        );

        const agent = await getAgent(mockParams.mock);

        expect(agent).toBe(mockAgent);
        expect(mockParams.withFunction('failover')).wasCalledOnce();
    });

    it(`should wait for fdc3 ready event and return window.fdc3`, async () => {
        let returnedAgent: DesktopAgent | undefined;

        getAgent().then(agent => (returnedAgent = agent));

        await wait();

        expect(returnedAgent).toBeUndefined();

        window.fdc3 = mockAgent;
        window.dispatchEvent(new Event('fdc3Ready'));

        await wait();

        expect(returnedAgent).toBe(mockAgent);
    });
});

async function wait(delay: number = 50): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => resolve(), delay);
    });
}
