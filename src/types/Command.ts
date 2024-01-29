import {
  number_integer,
  number_positive,
  string_markdown_text,
  string_name,
  string_version,
} from '.././types/typeAliases';
import { ExecutionType } from './ExecutionTypes';
import { ModelRequirements } from './ModelRequirements';

/**
 * Command is one piece of the prompt template which adds some logic to the prompt template or the whole pipeline.
 * It is parsed from the markdown from ul/ol items - one command per one item.
 */
export type Command =
    | PtbkUrlCommand
    | PtbkVersionCommand
    | ExecuteCommand
    | ModelCommand
    | ParameterCommand
    | PostprocessCommand
    | ExpectCommand;

/**
 * PtpVersion command tells which version is .ptp file using
 *
 * - It is used for backward compatibility
 * - It is defined per whole .ptp file in the header
 */
export interface PtbkUrlCommand {
    readonly type: 'PTBK_URL';
    readonly ptbkUrl: URL;
}

/**
 * PtpVersion command tells which version is .ptp file using
 *
 * - It is used for backward compatibility
 * - It is defined per whole .ptp file in the header
 */
export interface PtbkVersionCommand {
    readonly type: 'PTBK_VERSION';
    readonly ptbkVersion: string_version;
}

/**
 * Execute command tells how to execute the section
 * It can be either prompt template, script or simple template etc.
 */
export interface ExecuteCommand {
    readonly type: 'EXECUTE';
    readonly executionType: ExecutionType;
}

/**
 * Model command tells which model and modelRequirements to use for the prompt template. execution
 */
export interface ModelCommand {
    readonly type: 'MODEL';
    readonly key: keyof ModelRequirements;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly value: any /* <- TODO: Infer from used key, can it be done in TypeScript */;
}

/**
 * Parameter command describes one parameter of the prompt template
 *
 * - It can tell if it is input or output parameter
 * - It can have description
 * - In description it can have simple formatting BUT not markdown structure or reference to other parameters
 */
export interface ParameterCommand {
    readonly type: 'PARAMETER';
    readonly isInputParameter: boolean;
    readonly parameterName: string_name;
    readonly parameterDescription: string_markdown_text | null;
}

/**
 * Postprocess command describes which function to use for postprocessing
 * This will be created as separate execute script block bellow
 */
export interface PostprocessCommand {
    readonly type: 'POSTPROCESS';
    readonly functionName: string_name;
}

/**
 * Expect command describes the desired output of the prompt template (after post-processing)
 * It can set limits for the maximum/minimum length of the output, measured in characters, words, sentences, paragraphs,...
 *
 * Note: LLMs work with tokens, not characters, but in Promptbooks we want to use some human-recognisable and cross-model interoperable units.
 */
export interface ExpectCommand {
    readonly type: 'EXPECT';
    readonly sign: 'EXACTLY' | 'MINIMUM' | 'MAXIMUM';
    readonly unit: 'CHARACTER' | 'WORD' | 'SENTENCE' | 'PARAGRAPH' | 'LINE' | 'PAGE';
    readonly amount: number_integer & number_positive;
}
