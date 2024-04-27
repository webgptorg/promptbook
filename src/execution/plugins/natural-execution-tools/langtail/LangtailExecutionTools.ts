import type { NaturalExecutionTools } from '../../../NaturalExecutionTools';
import { OpenAiExecutionTools } from '../openai/OpenAiExecutionTools';

/**
 * Execution Tools for calling OpenAI API.
 */
export class LangtailExecutionTools extends OpenAiExecutionTools implements NaturalExecutionTools {}

/**
 * TODO: !!! Make lib which exports this
 */
