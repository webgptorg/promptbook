/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('../CodeBlock/CodeBlock', () => ({
    CodeBlock: ({ code, language }: { code: string; language?: string }) => (
        <div data-language={language} data-testid="codeblock">
            {code}
        </div>
    ),
}));

import { MarkdownContent } from './MarkdownContent';

describe('MarkdownContent details rendering', () => {
    it('toggles details blocks when their summary is clicked', async () => {
        const { container } = render(
            <MarkdownContent content="<details><summary>Tool response</summary>Hidden payload</details>" />,
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
            <MarkdownContent content="<details><summary>Debug info</summary>Initial payload</details>" />,
        );

        const initialDetails = container.querySelector<HTMLDetailsElement>('details');
        const initialSummary = screen.getByText('Debug info');

        fireEvent.click(initialSummary);
        await waitFor(() => expect(initialDetails?.open).toBe(true));

        rerender(<MarkdownContent content="<details><summary>Debug info</summary>Updated payload</details>" />);

        const rerenderedDetails = container.querySelector<HTMLDetailsElement>('details');
        expect(rerenderedDetails?.open).toBe(true);
        expect(screen.getByText('Updated payload')).toBeTruthy();
    });

    it('renders markdown inside details blocks', async () => {
        const { container } = render(
            <MarkdownContent
                content={
                    '<details open><summary>Tool response</summary>\n- First item\n- Second item\n\n```ts\nconst value = 1;\n```\n\n[Read docs](https://example.com)</details>'
                }
            />,
        );

        await waitFor(() => expect(screen.getByTestId('codeblock')).toBeTruthy());

        const details = container.querySelector('details');
        const link = screen.getByRole('link', { name: 'Read docs' });
        const codeBlock = screen.getByTestId('codeblock');

        expect(details?.querySelectorAll('ul li')).toHaveLength(2);
        expect(link.getAttribute('href')).toBe('https://example.com');
        expect(codeBlock.textContent).toContain('const value = 1;');
        expect(codeBlock.getAttribute('data-language')).toBe('ts');
    });

    it('sanitizes rendered HTML before inserting it into the DOM', () => {
        const { container } = render(
            <MarkdownContent
                content={[
                    '<img src="https://example.com/safe.png" onerror=\'alert(1)\' alt="Safe image">',
                    '<a href="jav&#x61;script:alert(1)">Bad link</a>',
                    '<svg><g onload=alert(1)></g></svg>',
                ].join('\n\n')}
            />,
        );

        const image = container.querySelector('img');
        const link = screen.getByText('Bad link');

        expect(image?.getAttribute('src')).toBe('https://example.com/safe.png');
        expect(image?.getAttribute('onerror')).toBeNull();
        expect(link.getAttribute('href')).toBeNull();
        expect(container.querySelector('svg')).toBeNull();
    });
});
