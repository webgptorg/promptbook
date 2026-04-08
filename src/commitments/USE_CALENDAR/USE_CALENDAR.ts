import { spaceTrim } from 'spacetrim';
import type { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { createUseCalendarToolFunctions } from './createUseCalendarToolFunctions';
import { createUseCalendarTools } from './createUseCalendarTools';
import { getUseCalendarToolTitles } from './getUseCalendarToolTitles';
import { normalizeConfiguredCalendars } from './normalizeConfiguredCalendars';
import { parseUseCalendarCommitmentContent, type CalendarReference } from './calendarReference';
import { UseCalendarWallet } from './UseCalendarWallet';

/**
 * USE CALENDAR commitment definition.
 *
 * `USE CALENDAR` enables calendar tooling so the agent can read and manage events
 * in one configured Google Calendar.
 *
 * Authentication is expected through runtime context provided by the host app UI.
 * Hosts can provide manual wallet tokens or host-managed OAuth tokens.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseCalendarCommitmentDefinition extends BaseCommitmentDefinition<'USE CALENDAR'> {
    public constructor() {
        super('USE CALENDAR', ['CALENDAR']);
    }

    /**
     * Short one-line description of USE CALENDAR.
     */
    get description(): string {
        return 'Enable calendar tools for reading and managing events through Google Calendar.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '📅';
    }

    /**
     * Markdown documentation for USE CALENDAR commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE CALENDAR

            Enables the agent to access and manage one Google Calendar.

            ## Key aspects

            - The first URL in the commitment should point to a Google Calendar URL.
            - Optional \`SCOPES\` lines can provide explicit OAuth scopes.
            - Optional extra instructions can follow calendar reference lines.
            - Runtime provides Google Calendar OAuth token (manual wallet token or host-managed OAuth token).
            - Tools support listing events, reading one event, creating events, updating events, deleting events, and inviting guests.

            ## Examples

            \`\`\`book
            Scheduling Assistant

            PERSONA You coordinate meetings and schedules.
            USE CALENDAR https://calendar.google.com/calendar/u/0/r
            \`\`\`

            \`\`\`book
            Executive Assistant

            USE CALENDAR https://calendar.google.com/calendar/u/0/r
            SCOPES https://www.googleapis.com/auth/calendar.readonly
            RULE Ask for confirmation before deleting events.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const parsedCommitment = parseUseCalendarCommitmentContent(content);
        const existingConfiguredCalendars = normalizeConfiguredCalendars(requirements._metadata?.useCalendars);
        if (parsedCommitment.calendar) {
            addConfiguredCalendarIfMissing(existingConfiguredCalendars, parsedCommitment.calendar);
        }

        const calendarsList =
            existingConfiguredCalendars.length > 0
                ? existingConfiguredCalendars
                      .map((calendar) =>
                          [
                              `- ${calendar.provider}: ${calendar.url}`,
                              calendar.scopes.length > 0 ? `  scopes: ${calendar.scopes.join(', ')}` : '',
                          ]
                              .filter(Boolean)
                              .join('\n'),
                      )
                      .join('\n')
                : '- Calendar is resolved from runtime context';
        const extraInstructions = formatOptionalInstructionBlock(
            'Calendar instructions',
            parsedCommitment.instructions,
        );

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: createUseCalendarTools(requirements.tools || []),
                _metadata: {
                    ...requirements._metadata,
                    useCalendar: true,
                    useCalendars: existingConfiguredCalendars,
                },
            },
            spaceTrim(
                (block) => `
                    Calendar tools:
                    - You can inspect and manage events in configured calendars.
                    - Supported operations include read, create, update, delete, invite guests, and reminders.
                    - Configured calendars:
                      ${block(calendarsList)}
                    - USE CALENDAR credentials are read from wallet records (ACCESS_TOKEN, service "${
                        UseCalendarWallet.service
                    }", key "${UseCalendarWallet.key}").
                    - If credentials are missing, ask user to connect calendar credentials in host UI and/or add them to wallet.
                    ${block(extraInstructions)}
                `,
            ),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return getUseCalendarToolTitles();
    }

    /**
     * Gets calendar tool function implementations.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return createUseCalendarToolFunctions();
    }
}

/**
 * Adds calendar into configured calendars list if it is not already present.
 *
 * @private function of UseCalendarCommitmentDefinition
 */
function addConfiguredCalendarIfMissing(
    configuredCalendars: Array<{
        provider: string;
        url: string;
        calendarId: string;
        scopes: string[];
        tokenRef?: string;
    }>,
    calendarReference: CalendarReference,
): void {
    if (
        configuredCalendars.some(
            (calendar) => calendar.provider === calendarReference.provider && calendar.url === calendarReference.url,
        )
    ) {
        return;
    }

    configuredCalendars.push({
        provider: calendarReference.provider,
        url: calendarReference.url,
        calendarId: calendarReference.calendarId,
        scopes: [...calendarReference.scopes],
        ...(calendarReference.tokenRef ? { tokenRef: calendarReference.tokenRef } : {}),
    });
}

// Note: [💞] Ignore a discrepancy between file name and entity name
