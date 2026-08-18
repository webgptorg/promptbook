import type {
    PlannedMessageManagerLastRunFilter,
    PlannedMessageManagerRecord,
    PlannedMessageManagerRecurrenceFilter,
    PlannedMessageManagerView,
} from '../plannedMessagesAdmin';
import type { PlannedMessageLifecycle } from './resolvePlannedMessageLifecycle';

/**
 * Stages shown by each planned-message manager view.
 *
 * This is the single place deciding what "active", "finished",... mean, so the tabs, the counters
 * shown on them, and the listed rows can never describe different sets of planned messages.
 *
 * @private internal admin utility of Agents Server
 */
export const PLANNED_MESSAGE_LIFECYCLES_BY_VIEW: Record<
    PlannedMessageManagerView,
    ReadonlyArray<PlannedMessageLifecycle>
> = {
    active: ['ONGOING', 'SCHEDULED', 'NOT_STARTED', 'PAUSED'],
    scheduled: ['SCHEDULED'],
    'not-started': ['NOT_STARTED'],
    ongoing: ['ONGOING'],
    paused: ['PAUSED'],
    finished: ['CANCELLED', 'ENDED', 'FAILED'],
    all: ['ONGOING', 'SCHEDULED', 'NOT_STARTED', 'PAUSED', 'CANCELLED', 'ENDED', 'FAILED'],
};

/**
 * Age of the newest wake-up still matching each last-run filter, in milliseconds.
 *
 * @private constant of `filterPlannedMessages`
 */
const PLANNED_MESSAGE_LAST_RUN_WINDOW_MS: Record<'hour' | 'day' | 'week', number> = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Filter value meaning "do not narrow by this parameter".
 *
 * @private constant of `filterPlannedMessages`
 */
const PLANNED_MESSAGE_FILTER_ANY_VALUE = 'all';

/**
 * Every parameter the planned-message manager can narrow its listing by.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageManagerFilters = {
    readonly view: PlannedMessageManagerView;

    /**
     * Permanent id of the agent whose planned messages are listed, or `all` for every agent.
     */
    readonly agentPermanentId: string;

    readonly recurrence: PlannedMessageManagerRecurrenceFilter;
    readonly lastRun: PlannedMessageManagerLastRunFilter;

    /**
     * Free text matched against the message, its ids, its agent, and its owner.
     */
    readonly search: string;
};

/**
 * Keeps only the planned messages matching every active filter.
 *
 * @param plannedMessages - All planned messages of the server.
 * @param filters - Parameters the administrator narrowed the listing by.
 * @param atDate - Moment the last-run windows are measured from.
 * @returns Matching planned messages, in the order they were given.
 *
 * @private internal admin utility of Agents Server
 */
export function filterPlannedMessages(
    plannedMessages: ReadonlyArray<PlannedMessageManagerRecord>,
    filters: PlannedMessageManagerFilters,
    atDate: Date,
): Array<PlannedMessageManagerRecord> {
    const normalizedSearch = filters.search.trim().toLowerCase();

    return plannedMessages.filter(
        (plannedMessage) =>
            isPlannedMessageInView(plannedMessage, filters.view) &&
            isPlannedMessageOfAgent(plannedMessage, filters.agentPermanentId) &&
            isPlannedMessageOfRecurrence(plannedMessage, filters.recurrence) &&
            isPlannedMessageLastRunInWindow(plannedMessage, filters.lastRun, atDate) &&
            isPlannedMessageMatchingSearch(plannedMessage, normalizedSearch),
    );
}

/**
 * Determines whether one planned message belongs to the selected view.
 *
 * @private function of `filterPlannedMessages`
 */
function isPlannedMessageInView(
    plannedMessage: PlannedMessageManagerRecord,
    view: PlannedMessageManagerView,
): boolean {
    return PLANNED_MESSAGE_LIFECYCLES_BY_VIEW[view].includes(plannedMessage.lifecycle);
}

/**
 * Determines whether one planned message belongs to the selected agent.
 *
 * @private function of `filterPlannedMessages`
 */
function isPlannedMessageOfAgent(plannedMessage: PlannedMessageManagerRecord, agentPermanentId: string): boolean {
    return (
        agentPermanentId === PLANNED_MESSAGE_FILTER_ANY_VALUE ||
        plannedMessage.agentPermanentId.toLowerCase() === agentPermanentId.toLowerCase()
    );
}

/**
 * Determines whether one planned message repeats the selected way.
 *
 * @private function of `filterPlannedMessages`
 */
function isPlannedMessageOfRecurrence(
    plannedMessage: PlannedMessageManagerRecord,
    recurrence: PlannedMessageManagerRecurrenceFilter,
): boolean {
    return recurrence === PLANNED_MESSAGE_FILTER_ANY_VALUE || plannedMessage.recurrenceKind === recurrence;
}

/**
 * Determines whether one planned message last woke its agent inside the selected window.
 *
 * @private function of `filterPlannedMessages`
 */
function isPlannedMessageLastRunInWindow(
    plannedMessage: PlannedMessageManagerRecord,
    lastRun: PlannedMessageManagerLastRunFilter,
    atDate: Date,
): boolean {
    if (lastRun === PLANNED_MESSAGE_FILTER_ANY_VALUE) {
        return true;
    }

    if (plannedMessage.lastFiredAt === null) {
        return lastRun === 'never';
    }

    if (lastRun === 'never') {
        return false;
    }

    const lastFiredAtTime = Date.parse(plannedMessage.lastFiredAt);
    if (!Number.isFinite(lastFiredAtTime)) {
        return false;
    }

    const lastRunAgeMs = atDate.getTime() - lastFiredAtTime;

    if (lastRun === 'older') {
        return lastRunAgeMs > PLANNED_MESSAGE_LAST_RUN_WINDOW_MS.week;
    }

    return lastRunAgeMs <= PLANNED_MESSAGE_LAST_RUN_WINDOW_MS[lastRun];
}

/**
 * Determines whether one planned message matches the free-text search.
 *
 * @private function of `filterPlannedMessages`
 */
function isPlannedMessageMatchingSearch(plannedMessage: PlannedMessageManagerRecord, normalizedSearch: string): boolean {
    if (normalizedSearch.length === 0) {
        return true;
    }

    const searchableValues = [
        plannedMessage.message,
        plannedMessage.timeoutId,
        plannedMessage.agentPermanentId,
        plannedMessage.agentName,
        plannedMessage.chatId,
        plannedMessage.username,
        String(plannedMessage.userId),
        plannedMessage.cronExpression,
    ];

    return searchableValues.some((value) => typeof value === 'string' && value.toLowerCase().includes(normalizedSearch));
}
