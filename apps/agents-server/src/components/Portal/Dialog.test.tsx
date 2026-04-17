/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { Dialog } from './Dialog';

/**
 * Minimal dialog content used to verify shared dismissal behavior.
 */
function renderTestDialog(props?: Partial<Parameters<typeof Dialog>[0]>) {
    const onClose = jest.fn();

    render(
        <Dialog onClose={onClose} ariaLabel="Test dialog" className="p-4" {...props}>
            <button type="button">Inside button</button>
        </Dialog>,
    );

    return { onClose };
}

describe('Dialog', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="portal-root"></div>';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('closes when the backdrop is clicked by default', () => {
        const { onClose } = renderTestDialog();

        fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores backdrop clicks when backdrop dismissal is disabled while still allowing Escape', () => {
        const { onClose } = renderTestDialog({ isBackdropDismissible: false });

        fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
        expect(onClose).toHaveBeenCalledTimes(0);

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
