import type { WritableDeep } from 'type-fest';
import { PromptbookLogicError } from '../../errors/PromptbookLogicError';
import type { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
import type { string_name } from '../../types/typeAliases';

type RenameParameterOptions = {
    /**
     * Promptbook to search and replace for parameters
     * This promptbook is returned as copy with replaced parameters
     */
    promptbook: PromptbookJson;

    /**
     * Original parameter name that should be replaced
     */
    oldParameterName: string_name;

    /**
     * New parameter name that should replace the original parameter name
     */
    newParameterName: string_name;
};

/**
 * Function renameParameter will find all usable parameters for given prompt template
 * In other words, it will find all parameters that are not used in the prompt template itseld and all its dependencies
 *
 * @throws {PromptbookLogicError} If the new parameter name is already used in the promptbook
 */
export function renameParameter(options: RenameParameterOptions): PromptbookJson {
    const { promptbook, oldParameterName, newParameterName } = options;

    if (promptbook.parameters.some((parameter) => parameter.name === newParameterName)) {
        throw new PromptbookLogicError(
            `Can not replace {${oldParameterName}} to {${newParameterName}} because {${newParameterName}} is already used in the promptbook`,
        );
    }

    const renamedPromptbook: WritableDeep<PromptbookJson> = {
        ...promptbook,
        parameters: [...promptbook.parameters],
        promptTemplates: [...promptbook.promptTemplates],
    };

    for (const parameter of renamedPromptbook.parameters) {
        if (parameter.name !== oldParameterName) {
            continue;
        }
        parameter.name = newParameterName;
    }

    for (const promptTemplate of renamedPromptbook.promptTemplates) {
        if (promptTemplate.resultingParameterName === oldParameterName) {
            promptTemplate.resultingParameterName = newParameterName;
        }
        promptTemplate.dependentParameterNames = promptTemplate.dependentParameterNames.map((dependentParameterName) =>
            dependentParameterName === oldParameterName ? newParameterName : dependentParameterName,
        );

        promptTemplate.content = promptTemplate.content.replace(
            new RegExp(`{${oldParameterName}}`, 'g'),
            `{${newParameterName}}`,
        );

        promptTemplate.title = promptTemplate.title.replace(
            new RegExp(`{${oldParameterName}}`, 'g'),
            `{${newParameterName}}`,
        );

        promptTemplate.description =
            promptTemplate.description === undefined
                ? undefined
                : promptTemplate.description.replace(new RegExp(`{${oldParameterName}}`, 'g'), `{${newParameterName}}`);
    }

    return renamedPromptbook;
}
