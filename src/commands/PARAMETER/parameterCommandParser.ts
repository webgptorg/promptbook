import spaceTrim from "spacetrim";
import { NotYetImplementedError } from "../../errors/NotYetImplementedError";
import { ParseError } from "../../errors/ParseError";
import type { PipelineJson } from "../../pipeline/PipelineJson/PipelineJson";
import type { string_markdown_text } from "../../types/typeAliases";
import { keepUnused } from "../../utils/organization/keepUnused";
import { validateParameterName } from "../../utils/validators/parameterName/validateParameterName";
import type { $PipelineJson } from "../_common/types/CommandParser";
import type { $TaskJson } from "../_common/types/CommandParser";
import type { CommandParserInput } from "../_common/types/CommandParser";
import type { PipelineBothCommandParser } from "../_common/types/CommandParser";
import type { ParameterCommand } from "./ParameterCommand";

/**
 * Parses the parameter command
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
 */
export const parameterCommandParser: PipelineBothCommandParser<ParameterCommand> =
	{
		/**
		 * Name of the command
		 */
		name: "PARAMETER",

		/**
		 * Aliases for the PARAMETER command
		 */
		aliasNames: [
			"PARAM",
			"INPUT_PARAM",
			"OUTPUT_PARAM",
			"INPUT_PARAMETER",
			"OUTPUT_PARAMETER",
		],

		/*
    Note: [🦈] No need for extra alias name because it is already preprocessed
    */

		/**
		 * BOILERPLATE command can be used in:
		 */
		isUsedInPipelineHead: true,
		isUsedInPipelineTask: true,

		/**
		 * Description of the PARAMETER command
		 */
		description: `Describes one parameter of the task`,

		/**
		 * Link to documentation
		 */
		documentationUrl: "https://github.com/webgptorg/promptbook/discussions/68",

		/**
		 * Example usages of the PARAMETER command
		 */
		examples: [
			"PARAMETER {title} Title of the book",
			"OUTPUT PARAMETER {websiteContent} Content of the book",
		],

		/**
		 * Parses the PARAMETER command
		 */
		parse(input: CommandParserInput): ParameterCommand {
			const { normalized, args, raw } = input;

			const parameterNameRaw = args.shift() || "";
			const parameterDescriptionRaw = args.join(" ");
			// <- TODO: When [🥶] fixed, change to:
			//        >   const parameterDescriptionRaw = rawArgs.split(parameterNameRaw).join('').trim();

			if (
				parameterDescriptionRaw &&
				parameterDescriptionRaw.match(
					/\{(?<embeddedParameterName>[a-z0-9_]+)\}/im,
				)
			) {
				throw new ParseError(
					spaceTrim(
						(block) => `
                        Parameter \`{${parameterNameRaw}}\` can not contain another parameter in description

                        The description:
                        ${block(parameterDescriptionRaw)}
                    `,
					),
				);
			}

			let isInput = normalized.startsWith("INPUT");
			let isOutput = normalized.startsWith("OUTPUT");

			if (raw.startsWith("> {")) {
				isInput = false;
				isOutput = false;
			}

			const parameterName = validateParameterName(parameterNameRaw);
			const parameterDescription = parameterDescriptionRaw.trim() || null;

			return {
				type: "PARAMETER",
				parameterName,
				parameterDescription,
				isInput,
				isOutput,
			} satisfies ParameterCommand;
		},

		/**
		 * Apply the PARAMETER command to the `pipelineJson`
		 *
		 * Note: `$` is used to indicate that this function mutates given `pipelineJson`
		 */
		$applyToPipelineJson(
			command: ParameterCommand,
			$pipelineJson: $PipelineJson,
		): void {
			keepUnused(command, $pipelineJson);
			// Note: [🍣] Do nothing, its application is implemented separately in `parsePipeline`
		},

		/**
		 * Apply the PARAMETER command to the `pipelineJson`
		 *
		 * Note: `$` is used to indicate that this function mutates given `taskJson`
		 */
		$applyToTaskJson(
			command: ParameterCommand,
			$taskJson: $TaskJson,
			$pipelineJson: $PipelineJson,
		): void {
			keepUnused(command, $taskJson, $pipelineJson);
			// Note: [🍣] Do nothing, its application is implemented separately in `parsePipeline`
		},

		/**
		 * Converts the PARAMETER command back to string
		 *
		 * Note: This is used in `pipelineJsonToString` utility
		 */
		stringify(command: ParameterCommand): string_markdown_text {
			keepUnused(command);
			return `---`; // <- TODO: [🛋] Implement
		},

		/**
		 * Reads the PARAMETER command from the `PipelineJson`
		 *
		 * Note: This is used in `pipelineJsonToString` utility
		 */
		takeFromPipelineJson(
			pipelineJson: PipelineJson,
		): ReadonlyArray<ParameterCommand> {
			keepUnused(pipelineJson);
			throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
		},

		/**
		 * Reads the PARAMETER command from the `TaskJson`
		 *
		 * Note: This is used in `pipelineJsonToString` utility
		 */
		takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<ParameterCommand> {
			keepUnused($taskJson);
			throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
		},
	};
