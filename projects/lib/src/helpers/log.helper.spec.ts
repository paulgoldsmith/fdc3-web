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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './log.helper.js';

describe('log.helper', () => {
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleDebug = console.debug;
    let mockConsole: { log: any; info: any; warn: any; error: any; debug: any };

    beforeEach(() => {
        mockConsole = {
            log: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        };

        console.log = mockConsole.log;
        console.info = mockConsole.info;
        console.warn = mockConsole.warn;
        console.error = mockConsole.error;
        console.debug = mockConsole.debug;
    });

    afterEach(() => {
        console.log = originalConsoleLog;
        console.info = originalConsoleInfo;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        console.debug = originalConsoleDebug;
    });

    describe('createLogger', () => {
        it('should create a logger that logs messages based on level', () => {
            const logger = createLogger('test');

            // INFO level message should be logged
            logger('INFO message', LogLevel.INFO);
            expect(mockConsole.info).toHaveBeenCalled();

            // WARN level message should be logged
            logger('WARN message', LogLevel.WARN);
            expect(mockConsole.warn).toHaveBeenCalled();

            // ERROR level message should be logged
            logger('ERROR message', LogLevel.ERROR);
            expect(mockConsole.error).toHaveBeenCalled();
        });

        it('should respect log level settings for connection messages', () => {
            // Set connection messages to WARN level only and disable proxy messages
            const logLevels: GetAgentLogLevels = {
                connection: LogLevel.WARN,
                proxy: LogLevel.NONE,
            };
            const logger = createLogger('GetAgent', logLevels);

            // DEBUG connection message should not be logged (below WARN level)
            logger('connection DEBUG message', LogLevel.DEBUG);
            expect(mockConsole.debug).not.toHaveBeenCalled();

            // INFO connection message should not be logged (below WARN level)
            logger('connection INFO message', LogLevel.INFO);
            expect(mockConsole.info).not.toHaveBeenCalled();

            // WARN connection message should be logged (at WARN level)
            logger('connection WARN message', LogLevel.WARN);
            expect(mockConsole.warn).toHaveBeenCalled();

            // ERROR connection message should be logged (above WARN level)
            logger('connection ERROR message', LogLevel.ERROR);
            expect(mockConsole.error).toHaveBeenCalled();
        });

        it('should respect log level settings for proxy messages', () => {
            // Set proxy messages to ERROR level only and turn off connection messages
            const logLevels: GetAgentLogLevels = {
                proxy: LogLevel.ERROR,
                connection: LogLevel.NONE,
            };
            // Using 'Agent' preface makes this an agent message (proxy category)
            const logger = createLogger('Agent', logLevels);

            // INFO proxy message should not be logged
            logger('INFO message', LogLevel.INFO);
            expect(mockConsole.info).not.toHaveBeenCalled();

            // WARN proxy message should not be logged
            logger('WARN message', LogLevel.WARN);
            expect(mockConsole.warn).not.toHaveBeenCalled();

            // ERROR proxy message should be logged
            logger('ERROR message', LogLevel.ERROR);
            expect(mockConsole.error).toHaveBeenCalled();
        });

        it('should apply NONE log level properly', () => {
            // Set all messages to not be logged
            const logLevels: GetAgentLogLevels = {
                connection: LogLevel.NONE,
                proxy: LogLevel.NONE,
            };
            const logger = createLogger('test', logLevels);

            // Reset mock calls before each test assertion
            mockConsole.error.mockReset();

            // Connection message should not be logged
            logger('connection ERROR message', LogLevel.ERROR);
            expect(mockConsole.error).not.toHaveBeenCalled();

            // Reset again before next test
            mockConsole.error.mockReset();

            // Proxy message (anything that's not connection/heartbeat) should not be logged
            logger('ERROR message', LogLevel.ERROR);
            expect(mockConsole.error).not.toHaveBeenCalled();
        });

        it('should handle logLevels with undefined properties', () => {
            // Create a logLevels object with undefined properties
            const logLevels: GetAgentLogLevels = {
                connection: undefined as any,
                proxy: undefined as any
            };
            const logger = createLogger('test', logLevels);

            // Should fall back to default behavior - log INFO level messages
            logger('test message', LogLevel.INFO);
            expect(mockConsole.info).toHaveBeenCalled();

            // Reset mock
            mockConsole.info.mockReset();

            // Connection messages specifically should still use default INFO level
            const connectionLogger = createLogger('GetAgent', logLevels);
            connectionLogger('connection handshake message', LogLevel.INFO);
            expect(mockConsole.info).toHaveBeenCalled();
        });

        it('should handle DEBUG level messages correctly', () => {
            // Set log levels to allow DEBUG messages (which by default would be filtered out)
            const logLevels: GetAgentLogLevels = {
                connection: LogLevel.DEBUG,
                proxy: LogLevel.DEBUG
            };
            
            // Create a non-connection message logger so we'll use the proxy level
            const logger = createLogger('test', logLevels);
            
            // Test DEBUG level messages
            logger('DEBUG message', LogLevel.DEBUG);
            
            // Verify debug was called
            expect(mockConsole.debug).toHaveBeenCalled();
        });

        it('should use console.log for unrecognized log levels', () => {
            // The LogLevel enum in @finos/fdc3 typically has these values:
            // DEBUG = 0, INFO = 1, WARN = 2, ERROR = 3, NONE = 4
            
            // Instead of trying to be clever, let's just mock the functions directly
            // to verify the behavior
            const originalSwitch = console.log;
            
            try {
                // Create a logger with permissive settings
                const logLevels: GetAgentLogLevels = {
                    connection: LogLevel.ERROR,
                    proxy: LogLevel.ERROR
                };
                
                // Override the console.log function directly to ensure it's called
                console.log = mockConsole.log;
                
                // Create a logger
                const logger = createLogger('test', logLevels);
                
                // Using a value that would normally be within the level range
                // but doesn't match any standard LogLevel enum values
                // We'll mock it to a value that ensures it passes the level check
                const mockValue = -99; // Something that will hit default case
                
                // Call the logger with our special value
                logger('Default message', mockValue as any);
                
                // Verify our mocked console.log was called
                expect(mockConsole.log).toHaveBeenCalled();
            } finally {
                // Restore the console.log function
                console.log = originalSwitch;
            }
        });
    });
});
