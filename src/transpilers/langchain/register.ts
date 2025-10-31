import { Registration } from '../../_packages/types.index';
import { $bookTranspilersRegister } from '../_common/register/$bookTranspilersRegister';
import { LangchainTranspiler } from './LangchainTranspiler';

/**
 * Registration of LLM provider
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available LLM tools
 *
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 *
 * TODO: !!!! Which package should export this?
 */
export const _LangchainTranspilerRegistration: Registration = $bookTranspilersRegister.register(LangchainTranspiler);

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
