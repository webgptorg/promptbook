import { ToolFunction } from '../../_packages/types.index';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { string_javascript_name } from '../../types/typeAliases';
import { getAllCommitmentDefinitions } from './getAllCommitmentDefinitions';

/**
 * Gets all function implementations provided by all commitments
 *
 * @public exported from `@promptbook/core`
 */

export function getAllCommitmentsToolFunctions(): Record<string_javascript_name, ToolFunction> {
    const allToolFunctions: Record<string_javascript_name, ToolFunction> = {};
    for (const commitmentDefinition of getAllCommitmentDefinitions()) {
        const toolFunctions = commitmentDefinition.getToolFunctions();
        for (const [funcName, funcImpl] of Object.entries(toolFunctions)) {
            if (allToolFunctions[funcName as string_javascript_name] !== undefined) {
                throw new UnexpectedError(
                    `Duplicate tool function name detected: \`${funcName}\` provided by commitment \`${commitmentDefinition.type}\``,
                );
            }

            allToolFunctions[funcName as string_javascript_name] = funcImpl;
        }
    }
    return allToolFunctions;
}
