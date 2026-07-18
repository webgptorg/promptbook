import { createServer } from 'net';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { AGENT_PROJECT_RUNTIME_HOST } from './agentProjectRuntimeConstants';

/**
 * Asks the operating system for one currently free TCP port.
 *
 * The returned port is free at the time of probing. Callers that need an owned listener
 * should bind immediately after receiving it.
 *
 * @param host - Host address used for the temporary probe listener.
 * @returns Free local TCP port.
 */
export async function findFreeTcpPort(host: string = AGENT_PROJECT_RUNTIME_HOST): Promise<number> {
    return await new Promise<number>((resolve, reject) => {
        const probeServer = createServer();

        probeServer.unref();
        probeServer.once('error', reject);
        probeServer.listen(0, host, () => {
            const address = probeServer.address();

            probeServer.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (address && typeof address === 'object' && typeof address.port === 'number') {
                    resolve(address.port);
                    return;
                }

                reject(
                    new UnexpectedError(
                        spaceTrim(`
                            Failed to resolve a free local TCP port.

                            The operating system did not report a numeric port for the temporary listener.
                        `),
                    ),
                );
            });
        });
    });
}

