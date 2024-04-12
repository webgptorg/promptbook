/* tslint:disable */
/* TODO: Enable TSLint */

import { normalizeTo_SCREAMING_CASE } from './normalizeTo_SCREAMING_CASE';

export function normalizeTo_snake_case(sentence: string): string {
    return normalizeTo_SCREAMING_CASE(sentence).toLowerCase();
}
