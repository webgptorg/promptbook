import { UnexpectedError } from '../../errors/UnexpectedError';
import { string_javascript_name } from '../../types/typeAliases';
import { just } from '../../utils/organization/just';
import { getAllCommitmentDefinitions } from './getAllCommitmentDefinitions';

/**
 * Gets all tool titles provided by all commitments
 *
 * @public exported from `@promptbook/core`
 */
export function getAllCommitmentsToolTitles(): Record<string_javascript_name, string> {
    const allToolTitles: Record<string_javascript_name, string> = {};
    for (const commitmentDefinition of getAllCommitmentDefinitions()) {
        const toolTitles = commitmentDefinition.getToolTitles();
        for (const [funcName, title] of Object.entries(toolTitles)) {
            if (
                allToolTitles[funcName as string_javascript_name] !== undefined &&
                just(false) /* <- Note: [⛹️] How to deal with commitment aliases */
            ) {
                throw new UnexpectedError(
                    `Duplicate tool function name detected: \`${funcName}\` provided by commitment \`${commitmentDefinition.type}\``,
                );
            }

            allToolTitles[funcName as string_javascript_name] = title;
        }
    }
    return allToolTitles;
}
