import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { showAlert } from '../../../components/AsyncDialogs/asyncDialogs';
import { getSafeCdnPath } from '../../../utils/cdn/utils/getSafeCdnPath';
import { normalizeUploadFilename } from '../../../utils/normalization/normalizeUploadFilename';
import { uploadFileToServer } from '../../../utils/upload/uploadFileToServer';
import type { UseImageGeneratorTestState } from './useImageGeneratorTestState';

/**
 * Props for image attachments editor.
 */
type ImageAttachmentsEditorProps = {
    attachments: UseImageGeneratorTestState['prompts'][number]['attachments'];
    onChange: (attachments: UseImageGeneratorTestState['prompts'][number]['attachments']) => void;
    disabled?: boolean;
};

/**
 * Props for local SVG icons used by the attachment controls.
 */
type IconProps = {
    size?: number;
    color?: string;
};

/**
 * Creates a short client-side identifier for a new uploaded attachment.
 */
function createAttachmentIdentifier(): string {
    return Math.random().toString(36).substring(7);
}

/**
 * Uploads one image attachment to the public upload endpoint.
 */
async function uploadImageAttachment(
    file: File,
): Promise<UseImageGeneratorTestState['prompts'][number]['attachments'][number]> {
    const normalizedFilename = normalizeUploadFilename(file.name);
    const uploadPath = getSafeCdnPath({
        pathname: normalizedFilename,
        pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX,
    });
    const uploadResult = await uploadFileToServer({
        file,
        pathname: uploadPath,
        purpose: 'IMAGE_GENERATOR_TEST_ATTACHMENT',
        contentType: file.type,
    });

    return {
        id: createAttachmentIdentifier(),
        name: file.name,
        type: file.type,
        url: uploadResult.url,
    };
}

/**
 * Uploads multiple image attachments while preserving the selected order.
 */
async function uploadImageAttachments(
    files: File[],
): Promise<UseImageGeneratorTestState['prompts'][number]['attachments']> {
    const uploadedAttachments: UseImageGeneratorTestState['prompts'][number]['attachments'] = [];

    for (const file of files) {
        uploadedAttachments.push(await uploadImageAttachment(file));
    }

    return uploadedAttachments;
}

/**
 * Removes one uploaded attachment by its local identifier.
 */
function removeAttachmentById(
    attachments: UseImageGeneratorTestState['prompts'][number]['attachments'],
    attachmentId: string,
): UseImageGeneratorTestState['prompts'][number]['attachments'] {
    return attachments.filter((attachment) => attachment.id !== attachmentId);
}

/**
 * Handles camera icon.
 */
function CameraIcon({ size = 24, color = 'currentColor' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/**
 * Handles close icon.
 */
function CloseIcon({ size = 24, color = 'currentColor' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M18 6L6 18M6 6L18 18"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/**
 * Handles image attachments editor.
 *
 * @private function of <ImageGeneratorTestClient/>
 */
export function ImageAttachmentsEditor({ attachments, onChange, disabled }: ImageAttachmentsEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const selectedFiles = event.target.files;

            if (!selectedFiles || selectedFiles.length === 0) {
                return;
            }

            setIsUploading(true);

            try {
                const uploadedAttachments = await uploadImageAttachments(Array.from(selectedFiles));
                onChange([...attachments, ...uploadedAttachments]);
            } catch (error) {
                console.error('Upload failed:', error);

                await showAlert({
                    title: 'Upload failed',
                    message: 'Failed to upload image',
                }).catch(() => undefined);
            } finally {
                setIsUploading(false);

                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        },
        [attachments, onChange],
    );

    const handleRemoveAttachment = useCallback(
        (attachmentId: string) => {
            onChange(removeAttachmentById(attachments, attachmentId));
        },
        [attachments, onChange],
    );

    return (
        <div className="space-y-2">
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="h-16 w-16 object-cover rounded border border-gray-200"
                            />
                            {!disabled && (
                                <button
                                    onClick={() => handleRemoveAttachment(attachment.id)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    title="Remove image"
                                    type="button"
                                >
                                    <CloseIcon size={12} color="white" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={disabled || isUploading}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                    className="text-xs flex items-center gap-1 px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    type="button"
                >
                    <CameraIcon size={14} />
                    {isUploading ? 'Uploading...' : 'Add Image'}
                </button>
            </div>
        </div>
    );
}
