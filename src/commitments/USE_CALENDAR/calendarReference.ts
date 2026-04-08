import { spaceTrim } from 'spacetrim';

/**
 * Hostnames accepted for Google Calendar references.
 *
 * @private internal USE CALENDAR constant
 */
const GOOGLE_CALENDAR_HOSTNAMES = new Set(['calendar.google.com', 'www.calendar.google.com']);

/**
 * Default Google Calendar OAuth scopes when commitment content does not list any.
 *
 * @private internal USE CALENDAR constant
 */
export const DEFAULT_GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'] as const;

/**
 * Calendar provider types currently supported by USE CALENDAR.
 *
 * @private internal utility of USE CALENDAR commitment
 */
export type CalendarProviderType = 'google';

/**
 * Canonical calendar reference resolved from commitment content.
 *
 * @private internal utility of USE CALENDAR commitment
 */
export type CalendarReference = {
    provider: CalendarProviderType;
    url: string;
    calendarId: string;
    scopes: string[];
    tokenRef?: string;
};

/**
 * Parsed `USE CALENDAR` payload.
 *
 * @private internal utility of USE CALENDAR commitment
 */
export type ParsedUseCalendarCommitmentContent = {
    calendar: CalendarReference | null;
    calendarUrlRaw: string | null;
    instructions: string;
};

/**
 * Parses one Google Calendar URL/reference into canonical details.
 *
 * Supported input forms:
 * - `https://calendar.google.com/...`
 * - `calendar.google.com/...`
 *
 * @private internal utility of USE CALENDAR commitment
 */
export function parseGoogleCalendarReference(rawReference: string): CalendarReference | null {
    const trimmedReference = rawReference.trim();
    if (!trimmedReference) {
        return null;
    }

    const normalizedReference = trimmedReference.startsWith('calendar.google.com/')
        ? `https://${trimmedReference}`
        : trimmedReference;

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(normalizedReference);
    } catch {
        return null;
    }

    if (!GOOGLE_CALENDAR_HOSTNAMES.has(parsedUrl.hostname.toLowerCase())) {
        return null;
    }

    parsedUrl.protocol = 'https:';
    parsedUrl.hash = '';

    return {
        provider: 'google',
        url: parsedUrl.toString(),
        calendarId: parseGoogleCalendarIdFromUrl(parsedUrl) || 'primary',
        scopes: [...DEFAULT_GOOGLE_CALENDAR_SCOPES],
    };
}

/**
 * Parses `USE CALENDAR` commitment content into calendar reference + optional instructions.
 *
 * @private internal utility of USE CALENDAR commitment
 */
export function parseUseCalendarCommitmentContent(content: string): ParsedUseCalendarCommitmentContent {
    const trimmedContent = spaceTrim(content);
    if (!trimmedContent) {
        return {
            calendar: null,
            calendarUrlRaw: null,
            instructions: '',
        };
    }

    const lines = trimmedContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length === 0) {
        return {
            calendar: null,
            calendarUrlRaw: null,
            instructions: '',
        };
    }

    let calendarReferenceRaw: string | null = null;
    let calendarReference: CalendarReference | null = null;
    const firstLine = lines[0] || '';
    const firstLineTokens = firstLine.split(/\s+/).filter(Boolean);

    for (const token of firstLineTokens) {
        const cleanedToken = token.replace(/[),.;:!?]+$/g, '');
        const parsedReference = parseGoogleCalendarReference(cleanedToken);
        if (!parsedReference) {
            continue;
        }

        calendarReferenceRaw = cleanedToken;
        calendarReference = parsedReference;
        break;
    }

    if (!calendarReference) {
        const firstUrl = findFirstUrlToken(trimmedContent);
        if (firstUrl) {
            calendarReferenceRaw = firstUrl;
            calendarReference = parseGoogleCalendarReference(firstUrl);
        }
    }

    const scopes = extractGoogleCalendarScopes(trimmedContent);
    if (calendarReference) {
        calendarReference = {
            ...calendarReference,
            scopes: scopes.length > 0 ? scopes : [...DEFAULT_GOOGLE_CALENDAR_SCOPES],
            tokenRef: extractTokenRef(trimmedContent),
        };
    }

    const instructionLines = [...lines];
    if (instructionLines.length > 0 && calendarReferenceRaw) {
        instructionLines[0] = removeTokenFromLine(instructionLines[0] || '', calendarReferenceRaw);
    }

    const filteredInstructionLines = instructionLines.filter(
        (line) => !/^\s*SCOPES?\s+/i.test(line) && !line.trim().startsWith('https://www.googleapis.com/auth/'),
    );

    return {
        calendar: calendarReference,
        calendarUrlRaw: calendarReferenceRaw,
        instructions: filteredInstructionLines.join('\n').trim(),
    };
}

/**
 * Extracts canonical calendar references from parsed commitments.
 *
 * @private internal utility of USE CALENDAR commitment
 */
export function extractUseCalendarReferencesFromCommitments(
    commitments: ReadonlyArray<{ type: string; content: string }>,
): CalendarReference[] {
    const knownReferences = new Set<string>();
    const references: CalendarReference[] = [];

    for (const commitment of commitments) {
        if (commitment.type !== 'USE CALENDAR') {
            continue;
        }

        const parsedCommitment = parseUseCalendarCommitmentContent(commitment.content);
        if (!parsedCommitment.calendar) {
            continue;
        }

        const key = `${parsedCommitment.calendar.provider}|${parsedCommitment.calendar.url}`;
        if (knownReferences.has(key)) {
            continue;
        }

        knownReferences.add(key);
        references.push(parsedCommitment.calendar);
    }

    return references;
}

/**
 * Attempts to resolve one concrete Google Calendar id from URL.
 *
 * @private internal utility of USE CALENDAR commitment
 */
export function parseGoogleCalendarIdFromUrl(url: URL): string | null {
    const rawCalendarId =
        url.searchParams.get('cid') || url.searchParams.get('src') || url.searchParams.get('calendarId');
    if (!rawCalendarId) {
        return null;
    }

    const decodedCalendarId = decodeURIComponent(rawCalendarId).trim();
    return decodedCalendarId || null;
}

/**
 * Finds the first URL-looking token in text.
 *
 * @private utility of USE CALENDAR commitment
 */
function findFirstUrlToken(text: string): string | null {
    const match = text.match(/https?:\/\/[^\s)]+/i);
    return match ? match[0] || null : null;
}

/**
 * Extracts Google Calendar OAuth scopes declared in commitment text.
 *
 * @private utility of USE CALENDAR commitment
 */
function extractGoogleCalendarScopes(content: string): string[] {
    const scopesFromUrls = content.match(/https:\/\/www\.googleapis\.com\/auth\/[A-Za-z0-9._/-]+/gim) || [];
    const scopesFromKeywordLines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /^\s*SCOPES?\s+/i.test(line))
        .flatMap((line) =>
            line
                .replace(/^\s*SCOPES?\s+/i, '')
                .split(/[,\s]+/)
                .map((scope) => scope.trim())
                .filter(Boolean),
        )
        .filter((scope) => scope.startsWith('https://www.googleapis.com/auth/'));

    const uniqueScopes = new Set<string>();
    for (const scope of [...scopesFromUrls, ...scopesFromKeywordLines]) {
        uniqueScopes.add(scope);
    }

    return [...uniqueScopes];
}

/**
 * Extracts optional token reference marker from commitment text.
 *
 * @private utility of USE CALENDAR commitment
 */
function extractTokenRef(content: string): string | undefined {
    const tokenRefMatch = content.match(/@[\w.-]+/);
    const tokenRef = tokenRefMatch?.[0]?.trim();
    return tokenRef || undefined;
}

/**
 * Removes one specific token from one instruction line.
 *
 * @private utility of USE CALENDAR commitment
 */
function removeTokenFromLine(line: string, token: string): string {
    const tokens = line.split(/\s+/).filter(Boolean);
    const filteredTokens = tokens.filter((lineToken) => lineToken.replace(/[),.;:!?]+$/g, '') !== token);
    return filteredTokens.join(' ').trim();
}

// Note: [💞] Ignore a discrepancy between file name and entity name
