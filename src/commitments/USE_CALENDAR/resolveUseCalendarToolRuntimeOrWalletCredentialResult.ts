import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';
import type { CalendarReference } from './calendarReference';
import { parseGoogleCalendarReference } from './calendarReference';
import { UseCalendarWallet } from './UseCalendarWallet';

/**
 * Shared hidden arguments potentially injected into any USE CALENDAR tool call.
 *
 * @private type of UseCalendarCommitmentDefinition
 */
export type UseCalendarToolArgsBase = {
    calendarUrl?: string;
    __promptbookToolRuntimeContext?: unknown;
};

/**
 * Minimal runtime context shape needed by USE CALENDAR tool functions.
 *
 * @private type of resolveUseCalendarToolRuntimeOrWalletCredentialResult
 */
type UseCalendarRuntimeContext = {
    calendars?: {
        googleAccessToken?: string;
        connections?: Array<{
            provider?: string;
            url?: string;
            calendarId?: string;
            scopes?: string[];
        }>;
    };
};

/**
 * Tool result returned when USE CALENDAR requires wallet credentials.
 *
 * @private type of resolveUseCalendarToolRuntimeOrWalletCredentialResult
 */
type CalendarWalletCredentialRequiredToolResult = {
    action: 'calendar-auth';
    status: 'wallet-credential-required';
    recordType: 'ACCESS_TOKEN';
    service: string;
    key: string;
    isUserScoped: boolean;
    isGlobal: boolean;
    provider: 'google';
    calendarUrl: string;
    scopes: string[];
    message: string;
};

/**
 * Resolved runtime payload used by USE CALENDAR tools.
 *
 * @private type of resolveUseCalendarToolRuntimeOrWalletCredentialResult
 */
type UseCalendarResolvedRuntime = {
    calendarReference: CalendarReference;
    accessToken: string;
};

/**
 * Runtime resolution result for USE CALENDAR tools.
 *
 * @private type of UseCalendarCommitmentDefinition
 */
export type UseCalendarToolRuntimeResolution = UseCalendarResolvedRuntime | { walletResult: string };

/**
 * Internal error used to signal missing wallet credentials.
 *
 * @private class of resolveUseCalendarToolRuntimeOrWalletCredentialResult
 */
class CalendarWalletCredentialRequiredError extends Error {
    public readonly service: string;
    public readonly key: string;
    public readonly calendarReference: CalendarReference;

    public constructor(options: { calendarReference: CalendarReference }) {
        super(
            'Google Calendar token is missing in wallet. Request it from user and store as ACCESS_TOKEN (service google_calendar, key use-calendar-google-token).',
        );
        this.name = 'CalendarWalletCredentialRequiredError';
        this.service = UseCalendarWallet.service;
        this.key = UseCalendarWallet.key;
        this.calendarReference = options.calendarReference;
    }
}

/**
 * Resolves calendar runtime or returns a wallet-credential-required payload when missing.
 *
 * @private function of UseCalendarCommitmentDefinition
 */
export function resolveUseCalendarToolRuntimeOrWalletCredentialResult(
    args: UseCalendarToolArgsBase,
): UseCalendarToolRuntimeResolution {
    try {
        return resolveUseCalendarToolRuntime(args);
    } catch (error) {
        if (error instanceof CalendarWalletCredentialRequiredError) {
            return {
                walletResult: JSON.stringify(createCalendarWalletCredentialRequiredResult(error)),
            };
        }

        throw error;
    }
}

/**
 * Resolves runtime calendar + token for a USE CALENDAR tool call.
 *
 * @private function of resolveUseCalendarToolRuntimeOrWalletCredentialResult
 */
function resolveUseCalendarToolRuntime(args: UseCalendarToolArgsBase): UseCalendarResolvedRuntime {
    const runtimeContext = (readToolRuntimeContextFromToolArgs(args as Record<string, unknown>) ||
        {}) as UseCalendarRuntimeContext;
    const configuredCalendars = normalizeConfiguredCalendars(runtimeContext.calendars?.connections);
    const calendarArgument = normalizeOptionalText(args.calendarUrl);

    let calendarReference: CalendarReference | null = null;
    if (calendarArgument) {
        calendarReference = parseGoogleCalendarReference(calendarArgument);
        if (!calendarReference) {
            throw new Error(`Calendar URL "${calendarArgument}" is invalid.`);
        }
    } else if (configuredCalendars.length === 1) {
        calendarReference = configuredCalendars[0] || null;
    } else if (configuredCalendars.length > 1) {
        throw new Error(
            'Calendar is ambiguous. Provide "calendarUrl" argument with one calendar from USE CALENDAR commitments.',
        );
    } else {
        throw new Error('Calendar is required. Provide "calendarUrl" argument in the tool call.');
    }

    if (!calendarReference) {
        throw new Error('Calendar is required but was not resolved.');
    }

    const accessToken = normalizeOptionalText(runtimeContext.calendars?.googleAccessToken) || '';
    if (!accessToken) {
        throw new CalendarWalletCredentialRequiredError({
            calendarReference,
        });
    }

    if (configuredCalendars.length > 0) {
        const allowedCalendarUrls = new Set(configuredCalendars.map((configuredCalendar) => configuredCalendar.url));
        if (!allowedCalendarUrls.has(calendarReference.url)) {
            throw new Error(`Calendar "${calendarReference.url}" is not configured by USE CALENDAR for this agent.`);
        }
    }

    return {
        calendarReference,
        accessToken,
    };
}

/**
 * Normalizes optional calendar list from runtime context.
 *
 * @private function of resolveUseCalendarToolRuntimeOrWalletCredentialResult
 */
function normalizeConfiguredCalendars(rawCalendars: unknown): CalendarReference[] {
    if (!Array.isArray(rawCalendars)) {
        return [];
    }

    const calendars: CalendarReference[] = [];
    const knownCalendars = new Set<string>();

    for (const rawCalendar of rawCalendars) {
        if (!rawCalendar || typeof rawCalendar !== 'object') {
            continue;
        }

        const calendar = rawCalendar as Record<string, unknown>;
        const rawUrl = normalizeOptionalText(calendar.url);
        if (!rawUrl) {
            continue;
        }

        const parsedReference = parseGoogleCalendarReference(rawUrl);
        if (!parsedReference) {
            continue;
        }

        const key = `${parsedReference.provider}|${parsedReference.url}`;
        if (knownCalendars.has(key)) {
            continue;
        }

        knownCalendars.add(key);

        const scopes = Array.isArray(calendar.scopes)
            ? calendar.scopes
                  .filter((scope): scope is string => typeof scope === 'string')
                  .map((scope) => scope.trim())
                  .filter(Boolean)
            : [];

        calendars.push({
            ...parsedReference,
            scopes: scopes.length > 0 ? scopes : parsedReference.scopes,
        });
    }

    return calendars;
}

/**
 * Converts missing-wallet errors into structured tool result payloads.
 *
 * @private function of resolveUseCalendarToolRuntimeOrWalletCredentialResult
 */
function createCalendarWalletCredentialRequiredResult(
    error: CalendarWalletCredentialRequiredError,
): CalendarWalletCredentialRequiredToolResult {
    return {
        action: 'calendar-auth',
        status: 'wallet-credential-required',
        recordType: 'ACCESS_TOKEN',
        service: error.service,
        key: error.key,
        isUserScoped: false,
        isGlobal: false,
        provider: 'google',
        calendarUrl: error.calendarReference.url,
        scopes: error.calendarReference.scopes,
        message: error.message,
    };
}

/**
 * Normalizes unknown text input to trimmed non-empty string.
 *
 * @private function of resolveUseCalendarToolRuntimeOrWalletCredentialResult
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
}
