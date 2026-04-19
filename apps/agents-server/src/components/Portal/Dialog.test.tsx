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

    it('closes when the backdrop receives an intentional click by default', () => {
        const { onClose } = renderTestDialog();
        const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;

        fireEvent.mouseDown(backdrop, { button: 0, clientX: 20, clientY: 20 });
        fireEvent.mouseUp(backdrop, { button: 0, clientX: 22, clientY: 23 });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores backdrop clicks when backdrop dismissal is disabled while still allowing Escape', () => {
        const { onClose } = renderTestDialog({ isBackdropDismissible: false });
        const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;

        fireEvent.mouseDown(backdrop, { button: 0, clientX: 20, clientY: 20 });
        fireEvent.mouseUp(backdrop, { button: 0, clientX: 20, clientY: 20 });
        expect(onClose).toHaveBeenCalledTimes(0);

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when the pointer starts inside the dialog and ends on the backdrop', () => {
        const { onClose } = renderTestDialog();
        const dialog = screen.getByRole('dialog');
        const backdrop = dialog.parentElement as HTMLElement;

        fireEvent.mouseDown(dialog, { button: 0, clientX: 40, clientY: 40 });
        fireEvent.mouseUp(backdrop, { button: 0, clientX: 60, clientY: 60 });

        expect(onClose).toHaveBeenCalledTimes(0);
    });

    it('does not close when the backdrop press moves too far to be a click', () => {
        const { onClose } = renderTestDialog();
        const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;

        fireEvent.mouseDown(backdrop, { button: 0, clientX: 20, clientY: 20 });
        fireEvent.mouseUp(backdrop, { button: 0, clientX: 40, clientY: 40 });

        expect(onClose).toHaveBeenCalledTimes(0);
    });
});
