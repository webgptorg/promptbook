import { describe, expect, it } from '@jest/globals';
import { book } from '../../../pipeline/book-notation';
import { isFlatPipeline } from './isFlatPipeline';

describe('isFlatPipeline', () => {
    it('should detect simple flat pipeline', () => {
        const pipeline = book`
              Hello
          `;

        expect(isFlatPipeline(pipeline)).toBe(true);
    });

    it('should detect multiline flat pipeline', () => {
        const pipeline = book`
                Hello
                How
                Are
                You
            `;

        expect(isFlatPipeline(pipeline)).toBe(true);
    });

    it('should detect flat pipeline with return statement', () => {
        const pipeline = book`
              Hello how are you?

              -> {response}
          `;

        expect(isFlatPipeline(pipeline)).toBe(true);
    });

    it('should detect non-flat pipeline because of ``` quoted block', () => {
        // Note: This is not a valid pipeline, its not flat because of the quoted block and also lacks things mandatory for non-flat pipeline
        const pipeline = book`
            Hello how are you?

            \`\`\`
            I am file!
            \`\`\`

            -> {response}
        `;

        expect(isFlatPipeline(pipeline)).toBe(false);
    });

    it('should detect non-flat pipeline because of > quoted block', () => {
        // Note: This is not a valid pipeline, its not flat because of the quoted block and also lacks things mandatory for non-flat pipeline
        const pipeline = book`
            Hello how are you?

            > I am file!

            -> {response}
        `;

        expect(isFlatPipeline(pipeline)).toBe(false);
    });

    // TODO: [🧉]

    it('should detect non-flat pipeline', () => {
        const pipeline = book`
            # Some Title

            ## Greeting

            > Hello

            -> {response}
        `;

        expect(isFlatPipeline(pipeline)).toBe(false);
    });
});
