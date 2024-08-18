import { $getGlobalScope } from '../../_packages/utils.index';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { Register } from '../../utils/Register';
import type { LlmToolsMetadata } from './LlmToolsMetadata';

// TODO: !!!!!! Move this logic to Register and rename to $Register
const globalScope = $getGlobalScope();

if (globalScope.$llmToolsMetadataRegister === undefined) {
    globalScope.$llmToolsMetadataRegister = [];
} else if (!Array.isArray(globalScope.$llmToolsMetadataRegister)) {
    throw new UnexpectedError(
        `Expected $llmToolsMetadataRegister to be an array, but got ${typeof globalScope.$llmToolsMetadataRegister}`,
    );
}

const _ = globalScope.$llmToolsMetadataRegister;

/**
 * @@@
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but thare can be more @@@
 * @public exported from `@promptbook/core`
 */
export const $llmToolsMetadataRegister = new Register<LlmToolsMetadata>(_);

$getGlobalScope().$llmToolsMetadataRegister;
