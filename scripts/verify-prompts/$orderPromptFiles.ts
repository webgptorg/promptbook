import { $shuffleItems } from '../find-fresh-emoji-tags/utils/$shuffleItems';
import type { PromptFile } from '../run-codex-prompts/prompts/types/PromptFile';
import type { VerifyPromptsOrder } from './VerifyPromptsOrder';

/**
 * Orders the loaded prompt files for one verification pass.
 *
 * Note: `$` is used to indicate that this function is not a pure function - the `random` order is not deterministic
 * Note: This function does NOT mutate the given array
 */
export function $orderPromptFiles(promptFiles: ReadonlyArray<PromptFile>, order: VerifyPromptsOrder): PromptFile[] {
    switch (order) {
        case 'from-earliest':
            return [...promptFiles];

        case 'from-latest':
            return [...promptFiles].reverse();

        case 'random':
            return [...$shuffleItems(...promptFiles)];
    }
}
