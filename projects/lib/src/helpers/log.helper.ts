/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import { LogLevel } from '../contracts.internal.js';

export function createLogger(preface: string): (message: string, level?: LogLevel, ...optionalParams: any[]) => void {
    return (message: string, level?: LogLevel, ...optionalParams: any[]) => {
        message = `[${preface}] ${message}`;

        optionalParams = [...optionalParams, window.location.href];

        switch (level) {
            case 'debug':
                console.debug(message, ...optionalParams);
                break;
            case 'info':
                console.info(message, ...optionalParams);
                break;
            case 'warn':
                console.warn(message, ...optionalParams);
                break;
            case 'error':
                console.error(message, ...optionalParams);
                break;
            default:
                console.log(message, ...optionalParams);
                break;
        }
    };
}
