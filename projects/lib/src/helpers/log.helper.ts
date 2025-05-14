/* Morgan Stanley makes this available to you under the Apache License,
 * Version 2.0 (the "License"). You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0.
 * See the NOTICE file distributed with this work for additional information
 * regarding copyright ownership. Unless required by applicable law or agreed
 * to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License. */

import { GetAgentLogLevels, LogLevel } from '@finos/fdc3';

/**
 * Creates a logger with specified options
 * @param preface - The prefix for log messages
 * @param logLevels - Optional settings to control logging behavior
 * @returns A logger function
 */
export function createLogger(
    preface: string,
    logLevels?: GetAgentLogLevels,
): (message: string, level?: LogLevel, ...optionalParams: any[]) => void {
    return (message: string, level?: LogLevel, ...optionalParams: any[]) => {
        // Determine effective log level based on the message type and configured levels
        // Connection-related messages include handshakes, connections, and waiting for connections
        // Determine if this is a connection-related message based on preface and message content
        const isConnectionMessage =
            (preface.toLowerCase().includes('getagent') || preface.toLowerCase().includes('desktopagent')) &&
            (message.toLowerCase().includes('connection') ||
                message.toLowerCase().includes('handshake') ||
                message.toLowerCase().includes('waitfor') ||
                message.toLowerCase().includes('heartbeat'));

        // Default log level is INFO for connection messages, WARN for everything else
        let effectiveLogLevel = LogLevel.INFO;

        // Apply user configuration if available
        if (logLevels) {
            if (isConnectionMessage && logLevels.connection !== undefined) {
                effectiveLogLevel = logLevels.connection;
            } else if (logLevels.proxy !== undefined) {
                // Everything that's not a connection or heartbeat message is a proxy message
                effectiveLogLevel = logLevels.proxy;
            }
        }

        // Determine numeric level of current message
        let messageLevel = LogLevel.INFO; // Default if not provided
        if (level !== undefined) {
            messageLevel = level;
        }

        // Skip if message level is higher than effective level or if level is NONE
        if (messageLevel > effectiveLogLevel || effectiveLogLevel === LogLevel.NONE) {
            return;
        }

        message = `[${preface}] ${message}`;
        optionalParams = [...optionalParams, window.location.href];

        // Output based on message level
        switch (messageLevel) {
            case LogLevel.DEBUG:
                console.debug(message, ...optionalParams);
                break;
            case LogLevel.INFO:
                console.info(message, ...optionalParams);
                break;
            case LogLevel.WARN:
                console.warn(message, ...optionalParams);
                break;
            case LogLevel.ERROR:
                console.error(message, ...optionalParams);
                break;
            default:
                console.log(message, ...optionalParams);
                break;
        }
    };
}
