import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { PersonaPreparedJson } from '../types/PipelineJson/PersonaPreparedJson';
import { string_persona_description } from '../types/typeAliases';

describe('how personaToModelRequirements works', () => {
    it('should work with simple persona description', () =>
        expect(personaToModelRequirements(`Copywriter`)).resolves.toBe({
            modelVariant: 'CHAT',
            modelName: 'gpt-4', // <- TODO: !!!! Allow to specify more model names
        }));

    it('should work with foo', () =>
        expect(
            personaToModelRequirements(
                spaceTrim(`
                    Foo

                    Bar

                    Baz
                `),
            ),
        ).resolves.toBe({
            modelVariant: 'CHAT',
            modelName: 'gpt-4', // <- TODO: !!!! Allow to specify more model names
        }));

    /*
    Note: Probbably no failure cases needed
        > it('should NOT work with bar', () =>
        >     expect(
        >         personaToModelRequirements(``),
        >     ).rejects.toThrowError(/---/));
    */
});

/**
 * Function personaToModelRequirements will @@@
 *
 * @private within the package
 */
export function personaToModelRequirements(
    value: string_persona_description,
): PersonaPreparedJson['modelRequirements'] {
    return value === 'Foo';
}
