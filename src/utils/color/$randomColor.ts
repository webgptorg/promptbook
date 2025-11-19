import { Color } from './Color';

/**
 * Creates a random color
 *
 * @public exported from `@promptbook/color`
 */
export function $randomColor(): Color {
    return Color.fromHex(
        Math.floor(Math.random(/* <- TODO: [🐉] Probbably use seed random */) * 16777215)
            .toString(16)
            .padStart(6, '0'),
    );
}

/**
 * TODO: !! Use Internally Color.fromValues
 * TODO: !! randomColorWithAlpha
 * TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
 */
