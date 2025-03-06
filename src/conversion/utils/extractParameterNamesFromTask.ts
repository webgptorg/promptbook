import type { ReadonlyDeep } from 'type-fest';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_parameter_name } from '../../types/typeAliases';
import { extractParameterNames } from '../../utils/parameters/extractParameterNames';

/**
 * Parses the task and returns the set of all used parameters
 *
 * @param task the task with used parameters
 * @returns the set of parameter names
 * @throws {ParseError} if the script is invalid
 * @public exported from `@promptbook/core` <- Note: [👖] This utility is so tightly interconnected with the Promptbook that it is not exported as util but in core
 */
export function extractParameterNamesFromTask(
    task: ReadonlyDeep<
        Pick<
            TaskJson,
            'title' | 'description' | 'taskType' | 'content' | 'preparedContent' | 'jokerParameterNames' | 'foreach'
        >
    >,
): Set<string_parameter_name> {
    const { title, description, /* [🙊] taskType,*/ content, preparedContent, jokerParameterNames, foreach } = task;
    const parameterNames = new Set<string_parameter_name>();

    for (const parameterName of [
        ...extractParameterNames(title),
        ...extractParameterNames(description || ''),
        ...extractParameterNames(content),
        ...extractParameterNames(preparedContent || ''),
    ]) {
        parameterNames.add(parameterName);
    }

    /*/
    // TODO: [🙊] Fix `extractVariablesFromScript` or delete
    if (taskType === 'SCRIPT_TASK') {
        for (const parameterName of extractVariablesFromScript(content)) {
            parameterNames.add(parameterName);
        }
    }
    /**/

    for (const jokerName of jokerParameterNames || []) {
        parameterNames.add(jokerName);
    }

    parameterNames.delete('content');
    //                      <- Note {websiteContent} is used in `preparedContent`

    // Note: [🍭] Fixing dependent subparameterName from FOREACH command
    if (foreach !== undefined) {
        for (const subparameterName of foreach.inputSubparameterNames) {
            if (parameterNames.has(subparameterName)) {
                parameterNames.delete(subparameterName);
                parameterNames.add(foreach.parameterName);
                // <- TODO: [🚎] Warn/logic error when `subparameterName` not used
            }
        }
    }

    return parameterNames;
}

/**
 * TODO: [🔣] If script require contentLanguage
 */
