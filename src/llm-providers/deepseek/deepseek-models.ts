import type { AvailableModel } from '../../execution/AvailableModel';
import { exportJson } from '../../utils/serialization/exportJson';

/**
 * List of available Deepseek models with descriptions
 *
 * Note: Done at 2025-04-22
 *
 * @see https://www.deepseek.com/models
 * @public exported from `@promptbook/deepseek`
 */
export const DEEPSEEK_MODELS: ReadonlyArray<
    AvailableModel & {
        modelDescription?: string;
    }
> = exportJson({
    name: 'DEEPSEEK_MODELS',
    value: [
        {
            modelVariant: 'CHAT',
            modelTitle: 'Deepseek Chat',
            modelName: 'deepseek-chat',
            modelDescription:
                'General-purpose language model with strong performance across conversation, reasoning, and content generation. 128K context window with excellent instruction following capabilities.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Deepseek Reasoner',
            modelName: 'deepseek-reasoner',
            modelDescription:
                'Specialized model focused on complex reasoning tasks like mathematical problem-solving and logical analysis. Enhanced step-by-step reasoning with explicit chain-of-thought processes. 128K context window.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek V3',
            modelName: 'deepseek-v3-0324',
            modelDescription:
                'Advanced general-purpose model with improved reasoning, coding abilities, and multimodal understanding. Built on the latest DeepSeek architecture with enhanced knowledge representation.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek R1',
            modelName: 'deepseek-r1',
            modelDescription:
                'Research-focused model optimized for scientific problem-solving and analytical tasks. Excellent performance on tasks requiring domain-specific expertise and critical thinking.',
        },
        // <- [🕕]
    ],
});

/**
 * TODO: [🧠] Add information about context window sizes, capabilities, and relative performance characteristics
 * TODO: [🎰] Some mechanism to auto-update available models
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
