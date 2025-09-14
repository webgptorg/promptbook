import type { string_url_image } from '../../types/typeAliases';

/**
 * Extracts profile image URL from agent definition text and returns cleaned system message
 * @param systemMessage The original system message that may contain META IMAGE line
 * @returns Object with profileImageUrl (if found) and cleanedSystemMessage (without META IMAGE line)
 *
 * @private - TODO: [🧠] Maybe should be public?
 */
export function extractProfileImageFromSystemMessage(systemMessage: string): {
    profileImageUrl?: string_url_image;
    cleanedSystemMessage: string;
} {
    if (!systemMessage) {
        return { cleanedSystemMessage: '' };
    }

    const lines = systemMessage.split('\n');
    const profileImageRegex = /^meta\s+image\s+(.+)$/i;
    let profileImageUrl: string_url_image | undefined;
    const cleanedLines: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        const match = trimmedLine.match(profileImageRegex);

        if (match) {
            // Extract the URL from the matched line
            profileImageUrl = match[1]!.trim() as string_url_image;
        } else {
            // Keep all other lines
            cleanedLines.push(line);
        }
    }

    return {
        profileImageUrl,
        cleanedSystemMessage: cleanedLines.join('\n'),
    };
}
