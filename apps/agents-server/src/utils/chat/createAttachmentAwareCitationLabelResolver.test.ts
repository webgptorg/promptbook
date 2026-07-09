import { describe, expect, it } from '@jest/globals';
import type { ChatMessage, ParsedCitation } from '@promptbook-local/types';
import { createAttachmentAwareCitationLabelResolver } from './createAttachmentAwareCitationLabelResolver';

/**
 * Builds a minimal chat message carrying only the attachments used by the resolver.
 *
 * @private test helper
 */
function createMessageWithAttachments(attachments: NonNullable<ChatMessage['attachments']>): ChatMessage {
    return {
        sender: 'USER',
        content: 'Please look at these photos.',
        attachments,
    } as ChatMessage;
}

/**
 * Builds one parsed citation payload for the resolver.
 *
 * @private test helper
 */
function createCitation(citation: Partial<ParsedCitation> & Pick<ParsedCitation, 'source'>): ParsedCitation {
    return {
        id: '0:0',
        ...citation,
    };
}

describe('createAttachmentAwareCitationLabelResolver', () => {
    const attachmentUrl = 'https://cdn.example.com/d/s/abcdef/dsc-0139-2.JPG';
    const originalFilename = 'DSC_0139 (2).JPG';
    const messages = [
        createMessageWithAttachments([{ name: originalFilename, type: 'image/jpeg', url: attachmentUrl }]),
    ];

    it('returns the original attachment filename when the citation source is the attachment URL', async () => {
        const resolveCitationLabel = createAttachmentAwareCitationLabelResolver(messages);

        expect(await resolveCitationLabel(createCitation({ source: attachmentUrl }))).toBe(originalFilename);
    });

    it('returns the original attachment filename when the citation url is the attachment URL', async () => {
        const resolveCitationLabel = createAttachmentAwareCitationLabelResolver(messages);

        expect(
            await resolveCitationLabel(createCitation({ source: 'dsc-0139-2.JPG', url: attachmentUrl })),
        ).toBe(originalFilename);
    });

    it('matches attachments even when the model appends trailing punctuation or a query string', async () => {
        const resolveCitationLabel = createAttachmentAwareCitationLabelResolver(messages);

        expect(await resolveCitationLabel(createCitation({ source: `${attachmentUrl}).` }))).toBe(originalFilename);
        expect(await resolveCitationLabel(createCitation({ source: `${attachmentUrl}?download=1` }))).toBe(
            originalFilename,
        );
    });

    it('delegates to the shared server resolver for non-attachment citations', async () => {
        const resolveCitationLabel = createAttachmentAwareCitationLabelResolver(messages);

        // Note: A citation that carries an explicit title is returned as-is by the shared resolver
        //       without any network request, which proves the resolver delegated instead of matching.
        expect(
            await resolveCitationLabel(
                createCitation({ source: 'https://example.com/report.html', title: 'Quarterly report' }),
            ),
        ).toBe('Quarterly report');
    });

    it('does not treat unrelated CDN files with the same normalized name as a match', async () => {
        const resolveCitationLabel = createAttachmentAwareCitationLabelResolver(messages);
        const differentHashUrl = 'https://cdn.example.com/x/y/999999/dsc-0139-2.JPG';

        // Note: Same filename but a different content hash must not resolve to the attachment name.
        expect(await resolveCitationLabel(createCitation({ source: differentHashUrl, title: 'Other file' }))).toBe(
            'Other file',
        );
    });
});
