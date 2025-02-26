import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { importPipelineJson } from '../../../conversion/validation/_importPipeline';
import { importPipelineJsonAsString } from '../../../conversion/validation/_importPipeline';
import { stringifyPipelineJson } from './stringifyPipelineJson';

describe('how stringifyPipelineJson works', () => {
    it('should work with markdown-knowledge.bookc', () =>
        expect(
            stringifyPipelineJson({
                index: [
                    -0.028091298, 0.0022211724, -0.0046637366, -0.007970089, -0.008006383, -0.01856784, -0.002780095,
                    -0.03638077, -0.077291, -0.036090422, 0.017566135, 0.015330445, 0.018524287, 0.0038072057,
                    -0.007875726, 0.036467876, -0.014967509, 0.008151558, 0.028236473, -0.009349249, 0.018988848,
                    -0.035742003, 0.028033229, 0.024403863, -0.021689096, 0.010982464, 0.03661305, 0.030022122,
                    -0.017493548, 0.00173393, 0.037455067, -0.02906397, 0.030109227, -0.021340678, -0.01782745,
                    -0.0012376141, -0.019046918, 0.012485022, 0.019366302, -0.0072768806, -0.023286017, 0.00093456195,
                    0.04941746, 0.06132178,
                ],
            }),
        ).toBe(
            spaceTrim(
                `
                    {
                        "index": [
                            -0.028091298, 0.0022211724, -0.0046637366, -0.007970089, -0.008006383, -0.01856784, -0.002780095, -0.03638077, -0.077291, -0.036090422, 0.017566135, 0.015330445, 0.018524287, 0.0038072057, -0.007875726, 0.036467876, -0.014967509, 0.008151558, 0.028236473, -0.009349249, 0.018988848, -0.035742003, 0.028033229, 0.024403863, -0.021689096, 0.010982464, 0.03661305, 0.030022122, -0.017493548, 0.00173393, 0.037455067, -0.02906397, 0.030109227, -0.021340678, -0.01782745, -0.0012376141, -0.019046918, 0.012485022, 0.019366302, -0.0072768806, -0.023286017, 0.00093456195, 0.04941746, 0.06132178
                        ]
                    }
                `,
            ) + '\n',
        ));

    it('should work with markdown-knowledge.bookc', () =>
        expect(stringifyPipelineJson(importPipelineJson('26-markdown-knowledge.bookc'))).toBe(
            importPipelineJsonAsString('26-markdown-knowledge.bookc'),
        ));
});
