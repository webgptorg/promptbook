import { ToolFunction } from '../../_packages/types.index';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { string_javascript_name } from '../../types/typeAliases';
import { just } from '../../utils/organization/just';
import { getAllCommitmentDefinitions } from './getAllCommitmentDefinitions';

/**
 * Map of tool functions keyed by function name.
 *
 * @private internal helper for commitment tool registry
 */
export type CommitmentToolFunctions = Record<string_javascript_name, ToolFunction>;

/**
 * Collects tool functions from all commitment definitions.
 *
 * @returns Map of tool function implementations.
 * @private internal helper for commitment tool registry
 */
export function collectCommitmentToolFunctions(): CommitmentToolFunctions {
    const allToolFunctions: CommitmentToolFunctions = {};
    for (const commitmentDefinition of getAllCommitmentDefinitions()) {
        const toolFunctions = commitmentDefinition.getToolFunctions();
        for (const [funcName, funcImpl] of Object.entries(toolFunctions)) {
            if (
                allToolFunctions[funcName as string_javascript_name] !== undefined &&
                just(false) /* <- Note: [??] How to deal with commitment aliases */
            ) {
                throw new UnexpectedError(
                    `Duplicate tool function name detected: \`${funcName}\` provided by commitment \`${commitmentDefinition.type}\``,
                );
            }

            allToolFunctions[funcName as string_javascript_name] = funcImpl;
        }
    }

    return allToolFunctions;
}

/**
 * Creates a proxy that resolves tool functions on demand.
 *
 * @param getFunctions - Provider of current tool functions.
 * @returns Proxy exposing tool functions as properties.
 * @private internal helper for commitment tool registry
 */
export function createToolFunctionsProxy(getFunctions: () => CommitmentToolFunctions): CommitmentToolFunctions {
    const resolveFunctions = () => getFunctions();

    return new Proxy<CommitmentToolFunctions>({} as CommitmentToolFunctions, {
        get(_target, prop) {
            if (typeof prop !== 'string') {
                return undefined;
            }

            return resolveFunctions()[prop as string_javascript_name];
        },
        has(_target, prop) {
            if (typeof prop !== 'string') {
                return false;
            }

            return prop in resolveFunctions();
        },
        ownKeys() {
            return Object.keys(resolveFunctions());
        },
        getOwnPropertyDescriptor(_target, prop) {
            if (typeof prop !== 'string') {
                return undefined;
            }

            const value = resolveFunctions()[prop as string_javascript_name];
            if (value === undefined) {
                return undefined;
            }

            return {
                enumerable: true,
                configurable: true,
                writable: false,
                value,
            };
        },
    });
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
