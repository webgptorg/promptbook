import { spaceTrim } from 'spacetrim';
import type { ParameterCommand } from '../../commands/PARAMETER/ParameterCommand';
import type { $PipelineJson } from '../../commands/_common/types/CommandParser';
import { RESERVED_PARAMETER_NAMES } from '../../constants';
import { ParseError } from '../../errors/ParseError';
import type { ParameterJson } from '../../pipeline/PipelineJson/ParameterJson';
import type { chococake } from '../../utils/organization/really_any';
import { getPipelineIdentification } from './getPipelineIdentification';

/**
 * Merges one parameter declaration into the mutable pipeline parameter list.
 *
 * @private internal utility of `parsePipeline`
 */
export function defineParameter($pipelineJson: $PipelineJson, parameterCommand: Omit<ParameterCommand, 'type'>): void {
    const { parameterName, parameterDescription, isInput, isOutput } = parameterCommand;

    if (RESERVED_PARAMETER_NAMES.includes(parameterName as chococake)) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Parameter name {${parameterName}} is reserved and cannot be used as resulting parameter name

                    ${block(getPipelineIdentification($pipelineJson))}
                `,
            ) /* <- TODO: [🚞] */,
        );
    }

    const existingParameter = $pipelineJson.parameters.find(
        (parameter: ParameterJson) => parameter.name === parameterName,
    );

    if (
        existingParameter &&
        existingParameter.description &&
        existingParameter.description !== parameterDescription &&
        parameterDescription
    ) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Parameter \`{${parameterName}}\` is defined multiple times with different description:

                    ${block(getPipelineIdentification($pipelineJson))}

                    First definition:
                    ${block(existingParameter.description || '[undefined]')}

                    Second definition:
                    ${block(parameterDescription || '[undefined]')}
                `, // <- TODO: [🚞]
            ),
        );
    }

    if (existingParameter) {
        if (parameterDescription) {
            existingParameter.description = parameterDescription;
        }

        existingParameter.isInput = existingParameter.isInput || isInput;
        existingParameter.isOutput = existingParameter.isOutput || isOutput;
        return;
    }

    $pipelineJson.parameters.push(
        {
            name: parameterName,
            description: parameterDescription || undefined,
            isInput,
            isOutput,
        } as ParameterJson,
        // <- Note: This type assertion is safe, only conflict is that in type definition `isInput` and `isOutput` cannot be both true
        //          but in this implementation it is possible, but it is not a problem it just does not make sense and its checked in [🆑] logic validaton
    );
}
