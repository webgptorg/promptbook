import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { JavascriptEvalExecutionTools } from './JavascriptEvalExecutionTools';

describe('JavascriptEvalExecutionTools', () => {
    const javascriptEvalExecutionTools = new JavascriptEvalExecutionTools({ isVerbose: true });

    it('should evaluate supersimple statement', () => {
        expect(
            javascriptEvalExecutionTools.execute({
                scriptLanguage: 'javascript',
                parameters: {
                    animal: 'cat',
                },
                script: 'animal',
            }),
        ).resolves.toEqual('cat');
        expect(
            javascriptEvalExecutionTools.execute({
                scriptLanguage: 'javascript',
                parameters: {
                    animal: 'cat',
                },
                script: 'return animal',
            }),
        ).resolves.toEqual('cat');
    });

    it('should evaluate single statement', () => {
        expect(
            javascriptEvalExecutionTools.execute({
                scriptLanguage: 'javascript',
                parameters: {
                    animal: 'cat',
                },
                script: 'return animal.split(\'\').reverse().join(\'-\')',
            }),
        ).resolves.toEqual('t-a-c');
    });

    it('should evaluate build-in function', () => {
        expect(
            javascriptEvalExecutionTools.execute({
                scriptLanguage: 'javascript',
                parameters: {
                    animal: '"cat"',
                },
                script: 'return removeQuotes(animal)',
            }),
        ).resolves.toEqual('cat');

        expect(
            javascriptEvalExecutionTools.execute({
                scriptLanguage: 'javascript',
                parameters: {
                    animal: 'The animal is: "dog"',
                },
                script: 'return unwrapResult(animal)',
            }),
        ).resolves.toEqual('dog');
    });

    it('should evaluate multiple statements', () => {
        expect(
            javascriptEvalExecutionTools.execute({
                scriptLanguage: 'javascript',
                parameters: {
                    animal: 'cat',
                    sound: 'meow',
                },
                script: spaceTrim(`
                    const sentence1 = animal + ' makes ' + sound + '.';
                    const sentence2 = \`Two \${animal}s makes \${sound} \${sound}.\`;
                    const sentence3 = \`Three \${animal}s makes \${sound} \${sound} \${sound}.\`;
                    return spaceTrim(\`
                        \${sentence1}
                        \${sentence2}
                        \${sentence3}
                    \`);
                `),
            }),
        ).resolves.toEqual(
            spaceTrim(`
                cat makes meow.
                Two cats makes meow meow.
                Three cats makes meow meow meow.
            `),
        );
    });

    it('should throw error from script', () => {
        () =>
            expect(
                javascriptEvalExecutionTools.execute({
                    scriptLanguage: 'javascript',
                    parameters: {},
                    script: 'throw new Error(\'Some error\')',
                }),
            ).rejects.toThrowError('Some error');
    });

    it('should evaluate custom function', () => {
        expect(
            javascriptEvalExecutionTools.execute({
                scriptLanguage: 'javascript',
                parameters: {
                    animal: 'cat',
                    sound: 'meow',
                },
                script: spaceTrim(`
                    function makeSentence(animal, sound) {
                        return animal + ' makes ' + sound + '.';
                    }
                    return makeSentence(animal, sound);
                `),
            }),
        ).resolves.toEqual('cat makes meow.');
    });

    it('should fail on python script', () => {
        expect(
            javascriptEvalExecutionTools.execute({
                scriptLanguage: 'python',
                parameters: {
                    animal: 'cat',
                },
                script: spaceTrim(`
                    print(animal);
                `),
            }),
        ).rejects.toThrowError(/not supported/i);
    });
});

/**
 * TODO: !! Make shared test between JavascriptEvalExecutionTools and JavascriptExecutionTools to test the same functionality when implemented via vm2
 */
