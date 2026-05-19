import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import { pipelineJsonToString } from './pipelineJsonToString';

// cspell:ignore Liness

describe('pipelineJsonToString', () => {
    it('should keep the existing markdown serialization for supported task types', () => {
        const pipelineJson: PipelineJson = {
            title: 'Example pipeline',
            pipelineUrl: 'https://example.com/example.book',
            bookVersion: '1.0.0',
            description: 'Pipeline description',
            formfactorName: 'GENERIC',
            parameters: [
                {
                    name: 'input',
                    description: 'Input value',
                    isInput: true,
                    isOutput: false,
                },
                {
                    name: 'cached',
                    description: 'Cached output',
                    isInput: false,
                    isOutput: false,
                },
                {
                    name: 'output',
                    description: 'Output value',
                    isInput: false,
                    isOutput: true,
                },
            ],
            defaultModelRequirements: undefined,
            tasks: [
                {
                    taskType: 'PROMPT_TASK',
                    name: 'write',
                    title: 'Write',
                    description: 'Write output',
                    dependentParameterNames: ['input', 'cached'],
                    jokerParameterNames: ['cached'],
                    content: 'Hello {input}',
                    postprocessingFunctionNames: ['trim'],
                    expectations: {
                        words: { min: 1, max: 1 },
                        lines: { min: 1, max: 2 },
                    },
                    format: 'JSON',
                    resultingParameterName: 'output',
                    modelRequirements: {
                        modelVariant: 'CHAT',
                        modelName: 'gpt-4o',
                    },
                },
                {
                    taskType: 'SIMPLE_TASK',
                    name: 'echo',
                    title: 'Echo',
                    description: 'Reuse output',
                    dependentParameterNames: ['output'],
                    content: '> {output}',
                    resultingParameterName: 'output',
                },
                {
                    taskType: 'SCRIPT_TASK',
                    name: 'transform',
                    title: 'Transform',
                    description: 'Transform output',
                    dependentParameterNames: ['output'],
                    content: 'print("Hello")',
                    resultingParameterName: 'output',
                    contentLanguage: 'python',
                },
                {
                    taskType: 'DIALOG_TASK',
                    name: 'ask',
                    title: 'Ask',
                    description: 'Ask the user',
                    dependentParameterNames: ['output'],
                    content: 'What next?',
                    resultingParameterName: 'output',
                },
            ],
            knowledgeSources: [],
            knowledgePieces: [],
            personas: [],
            preparations: [],
            sources: [],
        };

        expect(pipelineJsonToString(pipelineJson)).toBe(
            spaceTrim(`
                # Example pipeline

                Pipeline description

                <!-- Note: Prettier removed from Promptbook -->

                - PIPELINE URL https://example.com/example.book
                - BOOK VERSION 1.0.0
                - INPUT PARAMETER {input} Input value
                - OUTPUT PARAMETER {output} Output value

                ## Write

                Write output

                - MODEL VARIANT CHAT
                - MODEL NAME \`gpt-4o\`
                - JOKER {cached}
                - POSTPROCESSING \`trim\`
                - EXPECT EXACTLY 1 Words
                - EXPECT MIN 1 Lines
                - EXPECT MAX 2 Liness
                - FORMAT JSON

                \`\`\`text
                Hello {input}
                \`\`\`

                \`-> {output}\`

                ## Echo

                Reuse output

                - SIMPLE TEMPLATE

                \`\`\`text
                > {output}
                \`\`\`

                \`-> {output}\`

                ## Transform

                Transform output

                - SCRIPT

                \`\`\`python
                print("Hello")
                \`\`\`

                \`-> {output}\`

                ## Ask

                Ask the user

                - DIALOG

                \`\`\`text
                What next?
                \`\`\`

                \`-> {output}\`
            `),
        );
    });
});
