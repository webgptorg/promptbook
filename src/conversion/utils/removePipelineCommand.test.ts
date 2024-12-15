import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { PipelineString } from '../../_packages/types.index';
import { just } from '../../utils/organization/just';
import { removePipelineCommand } from './removePipelineCommand';

describe('how `removePipelineCommand` works', () => {
    it('should keep the pipeline when command is not there', () =>
        expect(
            removePipelineCommand({
                command: 'PERSONA',
                pipeline: spaceTrim(`
                    # Book

                    - KNOWLEDGE https://pavolhejny.com/
                `) as PipelineString,
            }),
        ).toBe(
            just(
                spaceTrim(`
                    # Book

                    - KNOWLEDGE https://pavolhejny.com/
                `),
            ),
        ));

    it('should remove the command', () =>
        expect(
            removePipelineCommand({
                command: 'KNOWLEDGE',
                pipeline: spaceTrim(`
                    # Book

                    - KNOWLEDGE https://pavolhejny.com/
                `) as PipelineString,
            }),
        ).toBe(
            just(
                spaceTrim(`
                    # Book

                `),
            ),
        ));

    it('should work in advanced case', () =>
        expect(
            removePipelineCommand({
                command: 'KNOWLEDGE',
                pipeline: spaceTrim(`
                    # Book

                    - KNOWLEDGE https://pavolhejny.com/
                    - PERSONA Paul, developer of the Promptbook

                    <!-- - KNOWLEDGE https://pavolhejny.com/ -->
                    <!--
                    - KNOWLEDGE Foooo
                    -->

                    ## Task

                    - KNOWLEDGE Foooo bar
                    - PERSONA Paul, developer of the Promptbook

                    \`\`\`
                    - KNOWLEDGE https://pavolhejny.com/
                    \`\`\`
                `) as PipelineString,
            }),
        ).toBe(
            just(
                spaceTrim(`
                    # Book

                    - PERSONA Paul, developer of the Promptbook

                    <!-- - KNOWLEDGE https://pavolhejny.com/ -->
                    <!--
                    - KNOWLEDGE Foooo
                    -->

                    ## Task

                    - PERSONA Paul, developer of the Promptbook

                    \`\`\`
                    - KNOWLEDGE https://pavolhejny.com/
                    \`\`\`
                `),
            ),
        ));
});
