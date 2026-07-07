/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { ChatInputUploadedFile } from './ChatInputUploadedFile';
import { useChatInputAreaComposer, type ChatComposerDraft } from './useChatInputAreaComposer';

/**
 * Props toggled between renders of `useChatInputAreaComposer` in these draft-message tests.
 */
type DraftMessageHookProps = { draftMessage?: ChatComposerDraft };

/**
 * Builds the always-required composer props that are irrelevant to draft-message behavior.
 */
function createBaseComposerProps() {
    const uploadedFilesRef: MutableRefObject<Array<ChatInputUploadedFile>> = { current: [] };

    return {
        isMobile: false,
        uploadedFiles: [] as ReadonlyArray<ChatInputUploadedFile>,
        uploadedFilesRef,
        clearUploadedFiles: () => undefined,
    };
}

describe('useChatInputAreaComposer draft message', () => {
    it('replaces the composer content when a new draft-message request arrives', () => {
        const base = createBaseComposerProps();
        const { result, rerender } = renderHook(
            (props: DraftMessageHookProps) => useChatInputAreaComposer({ ...base, ...props }),
            { initialProps: {} as DraftMessageHookProps },
        );

        expect(result.current.messageContent).toBe('');

        rerender({ draftMessage: { content: 'Editable draft text' } });
        expect(result.current.messageContent).toBe('Editable draft text');
    });

    it('re-applies a draft with identical text when a fresh request identity is provided', () => {
        const base = createBaseComposerProps();
        const { result, rerender } = renderHook(
            (props: DraftMessageHookProps) => useChatInputAreaComposer({ ...base, ...props }),
            { initialProps: { draftMessage: { content: 'Draft text' } } as DraftMessageHookProps },
        );

        expect(result.current.messageContent).toBe('Draft text');

        // The user edits the seeded draft away...
        act(() => {
            result.current.applyMessageContent('Edited by user');
        });
        expect(result.current.messageContent).toBe('Edited by user');

        // ...and clicking the same button again (fresh object identity) re-seeds the draft.
        rerender({ draftMessage: { content: 'Draft text' } });
        expect(result.current.messageContent).toBe('Draft text');
    });

    it('does not re-apply the same draft request identity after the user edits it', () => {
        const base = createBaseComposerProps();
        const stableDraft: ChatComposerDraft = { content: 'Draft text' };
        const { result, rerender } = renderHook(
            (props: DraftMessageHookProps) => useChatInputAreaComposer({ ...base, ...props }),
            { initialProps: { draftMessage: stableDraft } as DraftMessageHookProps },
        );

        expect(result.current.messageContent).toBe('Draft text');

        act(() => {
            result.current.applyMessageContent('Edited by user');
        });
        expect(result.current.messageContent).toBe('Edited by user');

        // Re-rendering with the same request identity must not clobber the user's edit.
        rerender({ draftMessage: stableDraft });
        expect(result.current.messageContent).toBe('Edited by user');
    });
});
