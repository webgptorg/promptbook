import { spaceTrim } from 'spacetrim';
import type { ToolFunction } from '../../_packages/types.index';

const FALLBACK_SEND_EMAIL_ERROR = spaceTrim(`
    send_email tool is not available in this environment.
    This commitment requires the Agents Server email queue to be configured.
`);

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
            throw new Error('send_email value is not a function');
        }

        return send_email as ToolFunction;
    } catch {
        return async () => {
            throw new Error(FALLBACK_SEND_EMAIL_ERROR);
        };
    }
}
