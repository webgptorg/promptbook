/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from '@jest/globals';

jest.mock('../CodeBlock/CodeBlock', () => ({
    CodeBlock: () => null,
}));

import { MarkdownContent } from './MarkdownContent';

describe('MarkdownContent details rendering', () => {
    it('toggles details blocks when their summary is clicked', async () => {
        const { container } = render(
            <MarkdownContent content={'<details><summary>Tool response</summary>Hidden payload</details>'} />,
        );

        const details = container.querySelector<HTMLDetailsElement>('details');
        const summary = screen.getByText('Tool response');

        expect(details).toBeTruthy();
        expect(details?.open).toBe(false);

        fireEvent.click(summary);
        await waitFor(() => expect(details?.open).toBe(true));

        fireEvent.click(summary);
        await waitFor(() => expect(details?.open).toBe(false));
    });

    it('preserves opened details across markdown rerenders', async () => {
        const { container, rerender } = render(
            <MarkdownContent content={'<details><summary>Debug info</summary>Initial payload</details>'} />,
        );

        const initialDetails = container.querySelector<HTMLDetailsElement>('details');
        const initialSummary = screen.getByText('Debug info');

        fireEvent.click(initialSummary);
        await waitFor(() => expect(initialDetails?.open).toBe(true));

        rerender(<MarkdownContent content={'<details><summary>Debug info</summary>Updated payload</details>'} />);

        const rerenderedDetails = container.querySelector<HTMLDetailsElement>('details');
        expect(rerenderedDetails?.open).toBe(true);
        expect(screen.getByText('Updated payload')).toBeTruthy();
    });
});
