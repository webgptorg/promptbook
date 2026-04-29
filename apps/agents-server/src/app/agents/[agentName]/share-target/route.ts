import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { resolveAgentVisibilityAccess } from '@/src/utils/agentAccess';
import { loadChatConfiguration } from '@/src/utils/chatConfiguration';
import { resolveShareTargetMessage } from '@/src/utils/shareTarget';
import { createShareTargetAttachments, storeShareTargetPayload } from '@/src/utils/shareTargetPayloads';
import { NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../../../src/errors/DatabaseError';
import { LimitReachedError } from '../../../../../../../src/errors/LimitReachedError';
import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';

/**
 * Creates one new chat launch payload from the Android share sheet and redirects into the installed PWA chat UI.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const collection = await $provideAgentCollectionForServer();
    const canonicalAgentId = await collection.getAgentPermanentId(agentName).catch(() => null);

    if (!canonicalAgentId) {
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const access = await resolveAgentVisibilityAccess({ agentIdentifier: canonicalAgentId, request });
    if (!access.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const sharedFiles = formData
            .getAll('files')
            .filter((entry): entry is File => typeof File !== 'undefined' && entry instanceof File);
        const { isFileAttachmentsEnabled } = await loadChatConfiguration();

        if (sharedFiles.length > 0 && !isFileAttachmentsEnabled) {
            throw new NotAllowed(
                spaceTrim(`
                    File attachments are currently disabled for this Agents Server.
                `),
            );
        }

        const attachments = await createShareTargetAttachments(sharedFiles);
        const message = resolveShareTargetMessage({
            title: normalizeShareTargetFormValue(formData.get('title')),
            text: normalizeShareTargetFormValue(formData.get('text')),
            url: normalizeShareTargetFormValue(formData.get('url')),
            attachmentCount: attachments.length,
        });

        if (!message && attachments.length === 0) {
            throw new NotAllowed(
                spaceTrim(`
                    Android share-target payload must contain text or one supported file attachment.
                `),
            );
        }

        const shareTargetPayload = await storeShareTargetPayload({
            agentPermanentId: canonicalAgentId,
            message: message || '',
            attachments,
        });
        const redirectUrl = new URL(
            `/agents/${encodeURIComponent(canonicalAgentId)}/chat?headless&newChat=1&shareTarget=${encodeURIComponent(
                shareTargetPayload.id,
            )}`,
            request.url,
        );

        return NextResponse.redirect(redirectUrl, 303);
    } catch (error) {
        if (error instanceof NotAllowed) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof LimitReachedError) {
            return NextResponse.json({ error: error.message }, { status: 413 });
        }

        if (error instanceof DatabaseError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.error('[share-target] Failed to process shared payload', error);
        return NextResponse.json({ error: 'Failed to open the shared content in this agent.' }, { status: 500 });
    }
}

/**
 * Normalizes one optional multipart text field.
 */
function normalizeShareTargetFormValue(value: FormDataEntryValue | null): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    return normalized === '' ? null : normalized;
}
