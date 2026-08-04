import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../src/errors/NotAllowed';

/**
 * Orders supported by `ptbk coder verify --order`.
 */
export const VERIFY_PROMPTS_ORDER_VALUES = ['from-earliest', 'from-latest', 'random'] as const;

/**
 * Order in which the prompt files are processed during one verification run.
 */
export type VerifyPromptsOrder = (typeof VERIFY_PROMPTS_ORDER_VALUES)[number];

/**
 * Order used when `--order` is not provided.
 */
export const DEFAULT_VERIFY_PROMPTS_ORDER: VerifyPromptsOrder = 'from-earliest';

/**
 * Human-readable description of each supported order, shared by the CLI help and the verification output.
 */
export const VERIFY_PROMPTS_ORDER_DESCRIPTIONS = {
    'from-earliest': 'from the earliest prompt file',
    'from-latest': 'from the latest prompt file',
    random: 'in random order',
} as const satisfies Record<VerifyPromptsOrder, string>;

/**
 * Parses and validates one raw `--order` value.
 *
 * Note: `ptbk coder verify` lets Commander validate the value, this is used by the standalone script which parses the raw arguments itself
 */
export function parseVerifyPromptsOrder(orderValue: string | undefined): VerifyPromptsOrder {
    if (orderValue === undefined) {
        return DEFAULT_VERIFY_PROMPTS_ORDER;
    }

    if ((VERIFY_PROMPTS_ORDER_VALUES as ReadonlyArray<string>).includes(orderValue)) {
        return orderValue as VerifyPromptsOrder;
    }

    throw new NotAllowed(
        spaceTrim(
            (block) => `
                Invalid value for \`--order\`: \`${orderValue}\`.

                Use one of the supported orders:
                ${block(
                    VERIFY_PROMPTS_ORDER_VALUES.map(
                        (value) =>
                            `- \`${value}\` processes the prompt files ${VERIFY_PROMPTS_ORDER_DESCRIPTIONS[value]}`,
                    ).join('\n'),
                )}

                Actionable hint:
                - The removed \`--reverse\` flag is now \`--order from-latest\`.
            `,
        ),
    );
}
