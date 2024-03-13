import { forTime } from 'waitasecond';
import type { string_javascript, string_javascript_name } from '../../../../../types/typeAliases';

/**
 * Preserves the function to eval scope
 * Compiler is tricked into thinking the functions are used with the given name
 *
 * @param functions in a record with the function name as key
 * @returns string to be called in eval()
 */
export function exportToEval(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    functions: Record<`_${string_javascript_name}`, (...params: Array<any>) => unknown>,
): Array<string_javascript> {
    const statementsToEval: Array<string_javascript> = [];

    for (const [_functionName, func] of Object.entries(functions)) {
        const functionName = _functionName.slice(1);
        statementsToEval.push(`const ${functionName} = ${_functionName}; try{${_functionName}()}catch(e){} `);

        (async () => {
            // TODO: Change to `await forEver` or something better
            await forTime(100000000);

            // [1]
            try {
                // Garbage-collector is tricked into thinking the function is used
                await func();
            } finally {
                // do nothing
            }
        })();
    }

    return statementsToEval;
}

/**
 * TODO: !! [1] This maybe does memory leak
 */
