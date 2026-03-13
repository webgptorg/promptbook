'use client';

import spaceTrim from 'spacetrim';
import { JavascriptExecutionTools } from '../../../../../src/_packages/javascript.index';
import { notifyError } from '../../components/Notifications/notifications';

/**
 * Shared JavaScript execution tools used for chat quick action buttons.
 */
const quickActionButtonExecutionTools = new JavascriptExecutionTools();

/**
 * Wraps arbitrary quick-action JavaScript so it executes inside the Promptbook engine API
 * while always satisfying the engine's string return contract.
 *
 * @param code Raw JavaScript source generated for one quick action button.
 * @returns Script body safe to hand over to `JavascriptExecutionTools.execute`.
 */
function createQuickActionButtonScript(code: string): string {
    return spaceTrim(
        (block) => `
            await (async () => {
                ${block(code)}
            })();

            return '';
        `,
    );
}

/**
 * Executes one quick action button inside the current browser page using Promptbook's
 * existing JavaScript execution engine.
 *
 * @param code Raw JavaScript source generated for one quick action button.
 * @returns Promise resolved when the browser-side action finishes.
 */
export async function executeQuickActionButton(code: string): Promise<void> {
    try {
        await quickActionButtonExecutionTools.execute({
            scriptLanguage: 'javascript',
            script: createQuickActionButtonScript(code),
            parameters: {},
        });
    } catch (error) {
        notifyError(error instanceof Error ? error.message : 'Failed to run the quick action.');
        throw error;
    }
}
