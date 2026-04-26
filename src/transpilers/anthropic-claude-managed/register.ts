import type { Registration } from '../../utils/misc/$Register';
import { $bookTranspilersRegister } from '../_common/register/$bookTranspilersRegister';
import { AnthropicClaudeManagedTranspiler } from './AnthropicClaudeManagedTranspiler';

/**
 * Registration of transpiler.
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools.
 *
 * TODO: [🧠] Which package should export this?
 *
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _AnthropicClaudeManagedTranspilerRegistration: Registration =
    $bookTranspilersRegister.register(AnthropicClaudeManagedTranspiler);

// Note: [💞] Ignore a discrepancy between file name and entity name
