import { describe, expect, it } from '@jest/globals';
import { DEFAULT_BOOK_OUTPUT_PARAMETER_NAME } from '../../../config';
import { DEFAULT_BOOK_TITLE } from '../../../config';
import { DEFAULT_PROMPT_TASK_TITLE } from '../../../config';
import { book } from '../../../pipeline/book-notation';
import { deflatePipeline } from './deflatePipeline';

describe('deflatePipeline', () => {
    it('should not modify non-flat pipeline', () => {
        const pipeline = book`
            # Some Title

            ## Greeting

            > Hello

            -> {response}
        `;

        expect(deflatePipeline(pipeline)).toBe(pipeline);
    });

    it('should convert flat pipeline to structured format', () => {
        const flatPipeline = book`
          Hello
      `;

        const expected = book`
            # ${DEFAULT_BOOK_TITLE}

            ## ${DEFAULT_PROMPT_TASK_TITLE}

            > Hello

            -> {${DEFAULT_BOOK_OUTPUT_PARAMETER_NAME}}
        `;

        expect(deflatePipeline(flatPipeline)).toBe(expected);
    });

    it('should convert flat pipeline with return statement to structured format', () => {
        const flatPipeline = book`
            Hello

            -> {response}
        `;

        const expected = book`
            # ${DEFAULT_BOOK_TITLE}

            ## Prompt

            > Hello

            -> {response}
        `;

        expect(deflatePipeline(flatPipeline)).toBe(expected);
    });

    it('should handle multi-line prompts', () => {
        const flatPipeline = book`
            Line 1
            Line 2
            Line 3

            -> {response}
        `;

        const expected = book`
            # ${DEFAULT_BOOK_TITLE}

            ## ${DEFAULT_PROMPT_TASK_TITLE}

            \`\`\`
            Line 1
            Line 2
            Line 3
            \`\`\`

            -> {response}
        `;

        expect(deflatePipeline(flatPipeline)).toBe(expected);
    });
});
