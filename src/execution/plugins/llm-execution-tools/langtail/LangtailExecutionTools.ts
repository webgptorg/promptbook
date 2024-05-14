import type { LlmExecutionTools } from '../../../LlmExecutionTools';
import { OpenAiExecutionTools } from '../openai/OpenAiExecutionTools';

/**
 * Execution Tools for calling OpenAI API.
 */
export class LangtailExecutionTools extends OpenAiExecutionTools implements LlmExecutionTools {}

/**
 * TODO: [🍓][♐] Allow to list the available prompts in Langtail
 */
