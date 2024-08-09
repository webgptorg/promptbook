/**
 * Semantic helper for SCREAMING_CASE strings
 *
 * @example 'HELLO_WORLD'
 * @example 'I_LOVE_PROMPTBOOK'
 * @public exported from `@promptbook/utils`
 */
export type string_SCREAMING_CASE = string;
/**
 * @@@
 *
 * @param text @@@
 * @returns @@@
 * @example 'HELLO_WORLD'
 * @example 'I_LOVE_PROMPTBOOK'
 * @public exported from `@promptbook/utils`
 */
export declare function normalizeTo_SCREAMING_CASE(text: string): string_SCREAMING_CASE;
/**
 * TODO: Tests
 *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: 'Moje tabule' })).toEqual('/VtG7sR9rRJqwNEdM2/Moje tabule');
 *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: 'ěščřžžýáíúů' })).toEqual('/VtG7sR9rRJqwNEdM2/escrzyaieuu');
 *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: '  ahoj  ' })).toEqual('/VtG7sR9rRJqwNEdM2/ahoj');
 *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: '  ahoj_ahojAhoj    ahoj  ' })).toEqual('/VtG7sR9rRJqwNEdM2/ahoj-ahoj-ahoj-ahoj');
 * TODO: [🌺] Use some intermediate util splitWords
 */
