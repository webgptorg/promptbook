import { LoremIpsum } from 'lorem-ipsum';
import { spaceTrim } from 'spacetrim';
import { JavascriptExecutionTools } from '../../_packages/execute-javascript.index';
import { CHARACTER_LOOP_LIMIT } from '../../config';
import { LimitReachedError } from '../../errors/LimitReachedError';
import { ScriptExecutionTools } from '../../execution/ScriptExecutionTools';
import { isPassingExpectations } from '../../execution/utils/checkExpectations';
import type { Expectations } from '../../types/PipelineJson/Expectations';
import { string_postprocessing_function_name } from '../../types/typeAliases';

/**
 * Gets the expectations and creates a fake text that meets the expectations
 *
 * Note: `$` is used to indicate that this function is not a pure function - it is not deterministic
 * Note: You can provide postprocessing functions to modify the text before checking the expectations
 *       The result will be the text BEFORE the postprocessing
 *
 * @private internal utility for MockedFackedLlmExecutionTools
 */
export async function $fakeTextToExpectations(
    expectations: Expectations,
    postprocessingFunctionNames?: Array<string_postprocessing_function_name>,
): Promise<string> {
    const lorem = new LoremIpsum(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            wordsPerSentence: { min: 5, max: 15 },
            sentencesPerParagraph: { min: 5, max: 15 },
        },
    );
    let loremText = '';
    let text = '';

    for (let loopLimit = CHARACTER_LOOP_LIMIT; loopLimit-- > 0; ) {
        let textToCheck = text;

        // TODO: DRY [☯]
        let scriptTools: ScriptExecutionTools | null = null;
        for (const postprocessingFunctionName of postprocessingFunctionNames || []) {
            if (scriptTools === null) {
                scriptTools = new JavascriptExecutionTools();
            }
            textToCheck = await scriptTools.execute({
                scriptLanguage: `javascript` /* <- TODO: Try it in each languages; In future allow postprocessing with arbitrary combination of languages to combine */,
                script: `${postprocessingFunctionName}(result)`,
                parameters: {
                    result: textToCheck || '',
                    // Note: No ...parametersForTemplate, because working with result only
                },
            });
        }

        if (isPassingExpectations(expectations, textToCheck)) {
            return text; // <- Note: Returning the text because the postprocessing
        }

        if (loremText === '') {
            loremText = lorem.generateParagraphs(1) + '\n\n';
        }

        text += loremText.substring(0, 1);
        loremText = loremText.substring(1);
    }

    throw new LimitReachedError(
        spaceTrim(
            (block) => `
                Can not generate fake text to met the expectations

                Loop limit reached
                The expectations:
                ${block(JSON.stringify(expectations, null, 4))}

                The draft text:
                ${block(text)}

            `,
        ),
    );
}

/**
 * TODO: [💝] Unite object for expecting amount and format - use here also a format
 */
