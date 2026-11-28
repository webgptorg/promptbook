import JSZip from 'jszip';
import { downloadBackupBinaryContent } from './downloadBackupBinaryContent';
import {
    createAttachmentReferencesByUrl,
    resolveAttachmentReferencesForUrls,
} from './serverBackupAttachments';
import {
    loadAgentRows,
    loadChatFeedbackRows,
    loadTableRows,
    loadUserChatRows,
    loadUserRows,
    type ServerBackupContext,
} from './serverBackupContext';
import {
    createBinaryMetadataFilename,
    createUniqueBackupFilename,
    resolveBinaryBackupFilename,
    resolvePathBasename,
} from './serverBackupFilenames';
import {
    createAgentPreviewById,
    createAgentPreviewByName,
    createAgentPreviewByPermanentId,
    createUserPreviewById,
} from './serverBackupPreviews';
import { deduplicateSerializableObjects, normalizeOptionalText } from './serverBackupRowUtilities';

/**
 * Writes uploaded files and generated images together with sidecar restore metadata.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the files section.
 * @param context - Shared backup context.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function appendFileBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    context: ServerBackupContext,
): Promise<void> {
    const [fileRows, imageRows, users, agents, userChats, feedbackRows] = await Promise.all([
        loadTableRows(context.supabase, 'File'),
        loadTableRows(context.supabase, 'Image'),
        loadUserRows(context),
        loadAgentRows(context),
        loadUserChatRows(context),
        loadChatFeedbackRows(context),
    ]);
    const uploadsRootPath = `${sectionRootPath}/uploads`;
    const imagesRootPath = `${sectionRootPath}/images`;
    const usedUploadFilenames = new Set<string>();
    const usedImageFilenames = new Set<string>();
    const userPreviewById = createUserPreviewById(users);
    const agentPreviewById = createAgentPreviewById(agents);
    const agentPreviewByPermanentId = createAgentPreviewByPermanentId(agents);
    const agentPreviewByName = createAgentPreviewByName(agents);
    const attachmentReferencesByUrl = createAttachmentReferencesByUrl({
        userChats,
        feedbackRows,
        userPreviewById,
        agentPreviewByPermanentId,
        agentPreviewByName,
    });

    zip.folder(uploadsRootPath);
    zip.folder(imagesRootPath);

    for (const fileRow of fileRows) {
        const contentUrl = normalizeOptionalText(fileRow.storageUrl) || normalizeOptionalText(fileRow.shortUrl);
        const filename = createUniqueBackupFilename(
            usedUploadFilenames,
            resolveBinaryBackupFilename(fileRow.fileName, contentUrl, `file-${fileRow.id}`),
            `file-${fileRow.id}`,
        );
        const downloadResult = await downloadBackupBinaryContent(contentUrl);
        const attachedToMessages = deduplicateSerializableObjects(
            resolveAttachmentReferencesForUrls(
                attachmentReferencesByUrl,
                [fileRow.storageUrl, fileRow.shortUrl],
            ),
        );

        if (downloadResult.content) {
            zip.file(`${uploadsRootPath}/${filename}`, downloadResult.content);
        }

        zip.file(
            `${uploadsRootPath}/${createBinaryMetadataFilename(filename)}`,
            `${JSON.stringify(
                {
                    kind: 'uploaded-file',
                    id: fileRow.id,
                    createdAt: fileRow.createdAt,
                    originalFileName: resolvePathBasename(fileRow.fileName, `file-${fileRow.id}`),
                    fileType: fileRow.fileType,
                    fileSize: fileRow.fileSize,
                    purpose: fileRow.purpose,
                    status: fileRow.status,
                    uploadedBy: typeof fileRow.userId === 'number' ? userPreviewById.get(fileRow.userId) || null : null,
                    agent: typeof fileRow.agentId === 'number' ? agentPreviewById.get(fileRow.agentId) || null : null,
                    attachedToMessages,
                    contentUrl,
                    contentIncluded: Boolean(downloadResult.content),
                    ...(downloadResult.error ? { contentDownloadError: downloadResult.error } : {}),
                },
                null,
                2,
            )}\n`,
        );
    }

    for (const imageRow of imageRows) {
        const filename = createUniqueBackupFilename(
            usedImageFilenames,
            resolveBinaryBackupFilename(imageRow.filename, imageRow.cdnUrl, `image-${imageRow.id}`),
            `image-${imageRow.id}`,
        );
        const downloadResult = await downloadBackupBinaryContent(imageRow.cdnUrl);

        if (downloadResult.content) {
            zip.file(`${imagesRootPath}/${filename}`, downloadResult.content);
        }

        zip.file(
            `${imagesRootPath}/${createBinaryMetadataFilename(filename)}`,
            `${JSON.stringify(
                {
                    kind: 'generated-image',
                    id: imageRow.id,
                    createdAt: imageRow.createdAt,
                    updatedAt: imageRow.updatedAt,
                    filename: imageRow.filename,
                    prompt: imageRow.prompt,
                    purpose: imageRow.purpose,
                    agent: typeof imageRow.agentId === 'number' ? agentPreviewById.get(imageRow.agentId) || null : null,
                    contentUrl: imageRow.cdnUrl,
                    contentIncluded: Boolean(downloadResult.content),
                    ...(downloadResult.error ? { contentDownloadError: downloadResult.error } : {}),
                },
                null,
                2,
            )}\n`,
        );
    }
}
