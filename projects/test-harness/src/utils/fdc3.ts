/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import type { Intent } from '@finos/fdc3';

/**
 * Retrieves the standard intents from the FDC3 Intents enumeration.
 *
 * Note: This function currently uses the `Intents` enum from `@finos/fdc3`,
 * which has been deprecated. An alternative approach should be considered,
 * such as using a static array of intents or finding a non-deprecated enum.
 *
 * @returns {string[]} An array of standard intent strings.
 */
export function getStandardIntents(): Intent[] {
    return [
        'CreateInteraction',
        'SendChatMessage',
        'StartCall',
        'StartChat',
        'StartEmail',
        'ViewAnalysis',
        'ViewChat',
        'ViewChart',
        'ViewContact',
        'ViewHoldings',
        'ViewInstrument',
        'ViewInteractions',
        'ViewMessages',
        'ViewNews',
        'ViewOrders',
        'ViewProfile',
        'ViewQuote',
        'ViewResearch',
    ];
}
