/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatCitationModal } from './ChatCitationModal';

jest.mock('../MarkdownContent/MarkdownContent', () => {
    return {
        MarkdownContent: ({ content }: { readonly content: string }) => <div>{content}</div>,
    };
});

/**
 * Installs a fetch mock that answers the citation embed check with the given result.
 *
 * @param canEmbed - Whether the preview URL can be embedded directly.
 * @returns Fetch mock.
 */
function mockEmbedCheck(canEmbed: boolean): jest.MockedFunction<typeof fetch> {
    const fetchMock = jest.fn(async () => {
        return {
            json: async () => ({ canEmbed }),
        } as Response;
    }) as jest.MockedFunction<typeof fetch>;

    global.fetch = fetchMock;
    return fetchMock;
}

describe('ChatCitationModal', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('moves blocked URL citations into the full live-browser popup with a toolbar close button', async () => {
        mockEmbedCheck(false);
        const handleClose = jest.fn();

        render(
            <ChatCitationModal
                isOpen
                citation={{ id: '1', source: 'https://example.com/blocked' }}
                participants={[]}
                onClose={handleClose}
            />,
        );

        const closePreviewButton = await screen.findByLabelText('Close preview');

        expect(screen.queryByLabelText('Close dialog')).toBeNull();

        fireEvent.click(closePreviewButton);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});
