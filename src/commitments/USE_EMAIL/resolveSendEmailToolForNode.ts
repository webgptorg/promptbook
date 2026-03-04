import { spaceTrim } from 'spacetrim';
import type { ToolFunction } from '../../_packages/types.index';
import { assertsError } from '../../errors/assertsError';

/**
 * Resolves the server-side implementation of the send_email tool for Node.js environments.
 *
 * This uses a lazy require so the core package can still load even if the Agents Server
 * module is unavailable. When the server tool cannot be resolved, a fallback implementation
 * throws a helpful error message.
 *
 * @private internal utility for USE EMAIL commitment
 */
export function resolveSendEmailToolForNode(): ToolFunction {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { send_email } = require('../../../apps/agents-server/src/tools/send_email');

        if (typeof send_email !== 'function') {
            throw new Error('send_email value is not a function but ' + typeof send_email);
        }

        return send_email as ToolFunction;
    } catch (error) {
        assertsError(error);

        return async () => {
            throw new Error(
                spaceTrim(
                    (block) => `
                        \`send_email\` tool is not available in this environment.
                        This commitment requires Agents Server runtime with wallet-backed SMTP sending.

                        ${error.name}:
                        ${block(error.message)}
                    `,
                ),
            );
        };
    }
}
