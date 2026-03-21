import { describe, expect, it } from '@jest/globals';
import { validateBook } from '../../../../../src/book-2.0/agent-source/string_book';
import { extractUseCalendarConnectionsFromAgentSource } from './extractUseCalendarConnectionsFromAgentSource';

describe('extractUseCalendarConnectionsFromAgentSource', () => {
    it('extracts canonical USE CALENDAR references', () => {
        const calendarConnections = extractUseCalendarConnectionsFromAgentSource(
            validateBook(`
                Calendar Agent
                USE CALENDAR https://calendar.google.com/calendar/u/0/r
                USE CALENDAR https://calendar.google.com/calendar/u/0/r?cid=team%40example.com
            `),
        );

        expect(calendarConnections).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provider: 'google',
                    calendarId: 'primary',
                }),
                expect.objectContaining({
                    provider: 'google',
                    calendarId: 'team@example.com',
                }),
            ]),
        );
    });
});
