import type { WritableDeep } from 'type-fest';
import { deepClone } from '../../utils/deepClone';
import { deepFreeze } from '../../utils/deepFreeze';
import type { PromptResultUsage } from '../PromptResultUsage';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const ZERO_USAGE = deepFreeze({
    price: { value: 0 },
    input: {
        tokensCount: { value: 0 },
        charactersCount: { value: 0 },
        wordsCount: { value: 0 },
        sentencesCount: { value: 0 },
        linesCount: { value: 0 },
        paragraphsCount: { value: 0 },
        pagesCount: { value: 0 },
    },
    output: {
        tokensCount: { value: 0 },
        charactersCount: { value: 0 },
        wordsCount: { value: 0 },
        sentencesCount: { value: 0 },
        linesCount: { value: 0 },
        paragraphsCount: { value: 0 },
        pagesCount: { value: 0 },
    },
} as const satisfies PromptResultUsage);

/**
 * Function `addUsage` will add multiple usages into one
 *
 * Note: If you provide 0 values, it returns ZERO_USAGE
 *
 * @public exported from `@promptbook/core`
 */
export function addUsage(...usageItems: Array<PromptResultUsage>): PromptResultUsage {
    return usageItems.reduce<PromptResultUsage>((acc: WritableDeep<PromptResultUsage>, item) => {
        acc.price.value += item.price?.value || 0;

        for (const key of Object.keys(acc.input)) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            if (item.input[key]) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                acc.input[key].value += item.input[key].value || 0;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                if (item.input[key].isUncertain) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    //@ts-ignore
                    acc.input[key].isUncertain = true;
                }
            }
        }

        for (const key of Object.keys(acc.output)) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            if (item.output[key]) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                acc.output[key].value += item.output[key].value || 0;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                if (item.output[key].isUncertain) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    //@ts-ignore
                    acc.output[key].isUncertain = true;
                }
            }
        }

        return acc;
    }, deepClone(ZERO_USAGE));
}
