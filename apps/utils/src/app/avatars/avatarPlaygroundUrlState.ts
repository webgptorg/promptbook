import type { ReadonlyURLSearchParams } from 'next/navigation';
import { AVATAR_VISUALS, type AvatarVisualId } from '../../../../../src/avatars';

/**
 * Default custom avatar name shown in the playground.
 */
export const DEFAULT_AGENT_NAME = 'Nebula Librarian';

/**
 * Default hash shown in the playground.
 */
export const DEFAULT_AGENT_HASH = '9ef4d6b45a8f0d73c4fb7b2f90d914550dfc8bcf5a053510c5bf09d37df8c7f3';

/**
 * Default colors shown in the playground.
 */
export const DEFAULT_AGENT_COLORS = ['#6d5dfc', '#0ea5e9', '#f97316'] as const;

/**
 * Default visual shown in the playground.
 */
export const DEFAULT_AVATAR_VISUAL_ID: AvatarVisualId = 'octopus';

/**
 * Query parameter for the selected visual.
 */
const VISUAL_QUERY_PARAM = 'visual';

/**
 * Query parameter for the agent name.
 */
const AGENT_NAME_QUERY_PARAM = 'name';

/**
 * Query parameter for the agent hash.
 */
const AGENT_HASH_QUERY_PARAM = 'hash';

/**
 * Repeated query parameter for avatar colors.
 */
const COLOR_QUERY_PARAM = 'color';

/**
 * Serialized state for the avatar playground.
 */
export type AvatarPlaygroundState = {
    agentName: string;
    agentHash: string;
    visualId: AvatarVisualId;
    colors: Array<string>;
};

/**
 * Parses avatar state from URL search parameters.
 *
 * @param searchParams Current page search parameters.
 * @param defaultVisualId Visual to fall back to when the URL does not specify a supported visual.
 * @returns Normalized avatar playground state.
 */
export function parseAvatarPlaygroundState(
    searchParams: URLSearchParams | ReadonlyURLSearchParams,
    defaultVisualId: AvatarVisualId = DEFAULT_AVATAR_VISUAL_ID,
): AvatarPlaygroundState {
    const colors = searchParams.getAll(COLOR_QUERY_PARAM);

    return {
        agentName: searchParams.get(AGENT_NAME_QUERY_PARAM) || DEFAULT_AGENT_NAME,
        agentHash: searchParams.get(AGENT_HASH_QUERY_PARAM) || DEFAULT_AGENT_HASH,
        visualId: normalizeAvatarVisualId(searchParams.get(VISUAL_QUERY_PARAM), defaultVisualId),
        colors: colors.length > 0 ? [...colors] : [...DEFAULT_AGENT_COLORS],
    };
}

/**
 * Serializes avatar state back into a query string while preserving unrelated parameters.
 *
 * @param state Avatar playground state to encode.
 * @param searchParams Current page search parameters.
 * @returns Query string without the leading `?`.
 */
export function stringifyAvatarPlaygroundState(
    state: AvatarPlaygroundState,
    searchParams: URLSearchParams | ReadonlyURLSearchParams,
): string {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    setSearchParam(nextSearchParams, AGENT_NAME_QUERY_PARAM, state.agentName);
    setSearchParam(nextSearchParams, AGENT_HASH_QUERY_PARAM, state.agentHash);
    setSearchParam(nextSearchParams, VISUAL_QUERY_PARAM, state.visualId);

    nextSearchParams.delete(COLOR_QUERY_PARAM);
    for (const color of state.colors) {
        nextSearchParams.append(COLOR_QUERY_PARAM, color);
    }

    return nextSearchParams.toString();
}

/**
 * Compares two avatar playground states.
 *
 * @param firstState First state.
 * @param secondState Second state.
 * @returns `true` when both states are equivalent.
 */
export function isSameAvatarPlaygroundState(
    firstState: AvatarPlaygroundState,
    secondState: AvatarPlaygroundState,
): boolean {
    return (
        firstState.agentName === secondState.agentName &&
        firstState.agentHash === secondState.agentHash &&
        firstState.visualId === secondState.visualId &&
        isSameStringArray(firstState.colors, secondState.colors)
    );
}

/**
 * Normalizes a possibly invalid visual id into a supported one.
 *
 * @param visualId Raw visual id from the URL.
 * @param defaultVisualId Visual to use when the URL value is missing or unsupported.
 * @returns Supported avatar visual id.
 */
function normalizeAvatarVisualId(visualId: string | null, defaultVisualId: AvatarVisualId): AvatarVisualId {
    if (isAvatarVisualId(visualId)) {
        return visualId;
    }

    return defaultVisualId;
}

/**
 * Checks whether a value is one of the supported avatar visual ids.
 *
 * @param visualId Raw visual id to validate.
 * @returns `true` when the value matches a registered visual.
 */
function isAvatarVisualId(visualId: string | null): visualId is AvatarVisualId {
    return visualId !== null && AVATAR_VISUALS.some((avatarVisual) => avatarVisual.id === visualId);
}

/**
 * Updates a single query parameter.
 *
 * @param searchParams Mutable search parameters.
 * @param key Search parameter key.
 * @param value Current value.
 */
function setSearchParam(searchParams: URLSearchParams, key: string, value: string): void {
    searchParams.set(key, value);
}

/**
 * Compares two string arrays by order and value.
 *
 * @param firstArray First array.
 * @param secondArray Second array.
 * @returns `true` when arrays contain the same values in the same order.
 */
function isSameStringArray(firstArray: Array<string> | ReadonlyArray<string>, secondArray: Array<string> | ReadonlyArray<string>): boolean {
    return (
        firstArray.length === secondArray.length &&
        firstArray.every((value, valueIndex) => value === secondArray[valueIndex])
    );
}
