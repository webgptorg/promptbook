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

/**
 * Extracts persona, examples, and profile image from agent definition text
 * @param systemMessage The original system message that may contain PERSONA, EXAMPLE, and META IMAGE lines
 * @returns Object with extracted information and cleaned system message
 *
 * @private - TODO: [🧠] Maybe should be public?
 */
export function extractAgentMetadata(systemMessage: string): {
    persona?: { name: string; description?: string };
    examples: string[];
    profileImageUrl?: string_url_image;
    cleanedSystemMessage: string;
} {
    if (!systemMessage) {
        return { examples: [], cleanedSystemMessage: '' };
    }

    const lines = systemMessage.split('\n');
    const personaRegex = /^persona\s+(.+)$/i;
    const exampleRegex = /^example\s+(.+)$/i;
    const profileImageRegex = /^meta\s+image\s+(.+)$/i;

    let persona: { name: string; description?: string } | undefined;
    const examples: string[] = [];
    let profileImageUrl: string_url_image | undefined;
    const cleanedLines: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();

        const personaMatch = trimmedLine.match(personaRegex);
        const exampleMatch = trimmedLine.match(exampleRegex);
        const profileImageMatch = trimmedLine.match(profileImageRegex);

        if (personaMatch) {
            // Extract persona name and description
            const personaText = personaMatch[1]!.trim();
            const commaIndex = personaText.indexOf(',');
            if (commaIndex > -1) {
                persona = {
                    name: personaText.substring(0, commaIndex).trim(),
                    description: personaText.substring(commaIndex + 1).trim(),
                };
            } else {
                persona = { name: personaText };
            }
        } else if (exampleMatch) {
            // Extract example content
            examples.push(exampleMatch[1]!.trim());
        } else if (profileImageMatch) {
            // Extract profile image URL
            profileImageUrl = profileImageMatch[1]!.trim() as string_url_image;
        } else {
            // Keep all other lines
            cleanedLines.push(line);
        }
    }

    return {
        persona,
        examples,
        profileImageUrl,
        cleanedSystemMessage: cleanedLines.join('\n'),
    };
}

/**
 * Generates a gravatar URL based on agent name for fallback avatar
 * @param name The agent name to generate avatar for
 * @returns Gravatar URL
 *
 * @private - TODO: [🧠] Maybe should be public?
 */
export function generateGravatarUrl(name?: string | null): string {
    // Use a default name if none provided
    const safeName = name || 'Anonymous Agent';

    // Create a simple hash from the name for consistent avatar
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
        const char = safeName.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const avatarId = Math.abs(hash).toString();
    return `https://www.gravatar.com/avatar/${avatarId}?default=robohash&size=200&rating=x`;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
