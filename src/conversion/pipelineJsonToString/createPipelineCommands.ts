import type { ParameterJson } from '../../pipeline/PipelineJson/ParameterJson';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';

/**
 * Collects pipeline-level commands in the existing serialization order.
 *
 * @private internal utility of `pipelineJsonToString`
 */
export function createPipelineCommands(pipelineJson: PipelineJson): Array<string> {
    const { pipelineUrl, bookVersion, parameters } = pipelineJson;
    const commands: Array<string> = [];

    if (pipelineUrl) {
        commands.push(`PIPELINE URL ${pipelineUrl}`);
    }

    if (bookVersion !== `undefined`) {
        commands.push(`BOOK VERSION ${bookVersion}`);
    }

    commands.push(...createParameterCommands(parameters, 'INPUT PARAMETER', ({ isInput }) => isInput));
    commands.push(...createParameterCommands(parameters, 'OUTPUT PARAMETER', ({ isOutput }) => isOutput));

    return commands;
}

/**
 * Builds one group of parameter commands while preserving the original parameter order.
 *
 * @private internal utility of `createPipelineCommands`
 */
function createParameterCommands(
    parameters: ReadonlyArray<ParameterJson>,
    commandPrefix: 'INPUT PARAMETER' | 'OUTPUT PARAMETER',
    isIncluded: (parameter: ParameterJson) => boolean,
): Array<string> {
    return parameters
        .filter((parameter) => isIncluded(parameter))
        .map((parameter) => `${commandPrefix} ${parameterJsonToString(parameter)}`);
}

/**
 * Converts one parameter JSON declaration to the serialized inline form.
 *
 * @private internal utility of `createPipelineCommands`
 */
function parameterJsonToString(parameterJson: ParameterJson): string {
    const { name, description } = parameterJson;

    if (!description) {
        return `{${name}}`;
    }

    return `{${name}} ${description}`;
}
