import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { arrayableToArray } from '../../utils/arrayableToArray';
import { MultipleLlmExecutionTools } from './MultipleLlmExecutionTools';
import { joinLlmExecutionTools } from './joinLlmExecutionTools';

/**
 * Just returns the given `LlmExecutionTools` or joins multiple into one
 *
 * @public exported from `@promptbook/core`
 */
export function getSingleLlmExecutionTools(
    oneOrMoreLlmExecutionTools: undefined | LlmExecutionTools | ReadonlyArray<LlmExecutionTools>,
): LlmExecutionTools | MultipleLlmExecutionTools {
    const _llms = arrayableToArray(oneOrMoreLlmExecutionTools);
    const llmTools =
        _llms.length === 1
            ? _llms[0]!
            : joinLlmExecutionTools('Multiple LLM Providers joined by `getSingleLlmExecutionTools`', ..._llms);

    return llmTools;
}

/**
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
