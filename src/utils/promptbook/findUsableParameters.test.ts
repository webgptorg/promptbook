import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../just';
import { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
import { PromptTemplateJson } from '../../types/PromptbookJson/PromptTemplateJson';
import { PromptTemplateParameterJson } from '../../types/PromptbookJson/PromptTemplateParameterJson';



describe('how findUsableParameters works', () => {
    it('should find no usable parameter', () =>
        expect(
            findUsableParameters(
               {promptbook,}
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo

                    Bar

                    Baz
                `),
            ),
        )
    );

    it('should NOT work with bar', () =>
        expect(
            findUsableParameters(
                spaceTrim(`
                    bar
                `),
            ),
        ).toBe(false)
    );
});

type FindUsableParametersOptions ={


  /**
   * 
   */
  promptbook: PromptbookJson


  promptTemplate: PromptTemplateJson
}


/**
 * Function findUsableParameters will @@@
 *
 * @private within the library
 */
export function findUsableParameters(options: PromptbookJson): Array<PromptTemplateParameterJson> {
    return value === 'Foo';
}
