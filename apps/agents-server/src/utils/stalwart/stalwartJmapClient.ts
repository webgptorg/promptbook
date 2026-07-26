import { EnvironmentMismatchError } from '../../../../../src/errors/EnvironmentMismatchError';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import type { StalwartConfiguration } from './StalwartConfiguration';

/**
 * JMAP capabilities required for Stalwart administration objects.
 */
const STALWART_JMAP_CAPABILITIES = ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'];

/**
 * Maximum wait for one local Stalwart API call.
 */
const STALWART_API_TIMEOUT_MS = 10_000;

/**
 * Generic JMAP method response tuple.
 */
type StalwartJmapMethodResponse = readonly [string, Readonly<Record<string, unknown>>, string];

/**
 * Calls one Stalwart management JMAP method and returns its response arguments.
 */
export async function callStalwartJmap(
    configuration: StalwartConfiguration,
    methodName: string,
    argumentsValue: Readonly<Record<string, unknown>>,
): Promise<Readonly<Record<string, unknown>>> {
    if (!configuration.authorization) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Stalwart API authentication is not configured.

                Set \`PTBK_STALWART_API_TOKEN\` or both
                \`PTBK_STALWART_API_USERNAME\` and \`PTBK_STALWART_API_PASSWORD\`.
            `),
        );
    }

    let response: Response;
    try {
        response = await fetch(configuration.apiUrl, {
            method: 'POST',
            cache: 'no-store',
            signal: AbortSignal.timeout(STALWART_API_TIMEOUT_MS),
            headers: {
                Authorization: configuration.authorization,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                methodCalls: [[methodName, argumentsValue, 'promptbook']],
                using: STALWART_JMAP_CAPABILITIES,
            }),
        });
    } catch (error) {
        throw new UnexpectedError(
            spaceTrim(`
                Failed to connect to the Stalwart management API at \`${configuration.apiUrl}\`.

                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }

    const responseText = await response.text();
    if (!response.ok) {
        throw new UnexpectedError(
            spaceTrim(`
                Stalwart management API returned HTTP \`${response.status}\`.

                **Response:** \`${responseText.slice(0, 500)}\`
            `),
        );
    }

    let payload: {
        readonly methodResponses?: ReadonlyArray<StalwartJmapMethodResponse>;
    };
    try {
        payload = JSON.parse(responseText) as typeof payload;
    } catch (error) {
        throw new UnexpectedError(
            spaceTrim(`
                Stalwart returned malformed JSON for the JMAP method \`${methodName}\`.

                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }
    const methodResponse = payload.methodResponses?.[0];
    if (!methodResponse || methodResponse[0] === 'error') {
        throw new UnexpectedError(
            spaceTrim(`
                Stalwart rejected the JMAP method \`${methodName}\`.

                **Response:** \`${JSON.stringify(methodResponse?.[1] || payload).slice(0, 1_000)}\`
            `),
        );
    }

    return methodResponse[1];
}

/**
 * Queries then loads all objects of one Stalwart management type.
 */
export async function listStalwartObjects(
    configuration: StalwartConfiguration,
    objectName: 'Domain' | 'Account' | 'MtaHook',
): Promise<ReadonlyArray<Readonly<Record<string, unknown>>>> {
    const queryResult = await callStalwartJmap(configuration, `x:${objectName}/query`, {
        filter: {},
        limit: 10_000,
    });
    const ids = Array.isArray(queryResult.ids)
        ? queryResult.ids.filter((id): id is string => typeof id === 'string')
        : [];

    if (ids.length === 0) {
        return [];
    }

    const getResult = await callStalwartJmap(configuration, `x:${objectName}/get`, { ids });
    return Array.isArray(getResult.list)
        ? getResult.list.filter(
              (item): item is Readonly<Record<string, unknown>> =>
                  Boolean(item) && typeof item === 'object' && !Array.isArray(item),
          )
        : [];
}

/**
 * Creates or updates one Stalwart management object.
 */
export async function setStalwartObject(
    configuration: StalwartConfiguration,
    objectName: 'Domain' | 'Account' | 'MtaHook',
    objectId: string | null,
    value: Readonly<Record<string, unknown>>,
): Promise<string> {
    const result = await callStalwartJmap(
        configuration,
        `x:${objectName}/set`,
        objectId
            ? {
                  update: {
                      [objectId]: value,
                  },
              }
            : {
                  create: {
                      promptbook: value,
                  },
              },
    );

    if (objectId) {
        const notUpdated = result.notUpdated as Record<string, unknown> | undefined;
        if (notUpdated?.[objectId]) {
            throw new UnexpectedError(`Stalwart failed to update \`${objectName}\` \`${objectId}\`.`);
        }
        return objectId;
    }

    const created = result.created as Record<string, { id?: unknown }> | undefined;
    const createdId = created?.promptbook?.id;
    if (typeof createdId !== 'string') {
        throw new UnexpectedError(`Stalwart failed to create the \`${objectName}\` object.`);
    }

    return createdId;
}
