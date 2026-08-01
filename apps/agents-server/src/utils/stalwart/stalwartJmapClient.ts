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
 * Key under which one object is created, so that its server-assigned id can be read back.
 */
const STALWART_CREATE_REQUEST_KEY = 'promptbook';

/**
 * Generic JMAP method response tuple.
 */
type StalwartJmapMethodResponse = readonly [string, Readonly<Record<string, unknown>>, string];

/**
 * Answer of one Stalwart management method, including the signal that the initial setup of the mail
 * server is still pending.
 */
export type StalwartJmapCallResult = {
    /**
     * Whether Stalwart refused the method because its initial setup is not finished yet.
     */
    readonly isBootstrapPending: boolean;

    /**
     * Response arguments of the method, empty when the bootstrap is still pending.
     */
    readonly responseArguments: Readonly<Record<string, unknown>>;
};

/**
 * Detects the answer which Stalwart returns for every management method while its initial setup is
 * still pending.
 */
function isStalwartBootstrapModeResponse(responseArguments: Readonly<Record<string, unknown>> | undefined): boolean {
    return (
        responseArguments?.type === 'forbidden' &&
        typeof responseArguments?.description === 'string' &&
        responseArguments.description.includes('bootstrap mode')
    );
}

/**
 * Calls one Stalwart management JMAP method and reports a still-pending bootstrap instead of throwing.
 *
 * Only the bootstrap itself may run against a mail server whose initial setup is not finished, so every
 * other caller uses `callStalwartJmap`.
 */
export async function callStalwartJmapAllowingBootstrapMode(
    configuration: StalwartConfiguration,
    methodName: string,
    argumentsValue: Readonly<Record<string, unknown>>,
): Promise<StalwartJmapCallResult> {
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
    if (isStalwartBootstrapModeResponse(methodResponse?.[1])) {
        return { isBootstrapPending: true, responseArguments: {} };
    }
    if (!methodResponse || methodResponse[0] === 'error') {
        throw new UnexpectedError(
            spaceTrim(`
                Stalwart rejected the JMAP method \`${methodName}\`.

                **Response:** \`${JSON.stringify(methodResponse?.[1] || payload).slice(0, 1_000)}\`
            `),
        );
    }

    return { isBootstrapPending: false, responseArguments: methodResponse[1] };
}

/**
 * Calls one Stalwart management JMAP method and returns its response arguments.
 */
export async function callStalwartJmap(
    configuration: StalwartConfiguration,
    methodName: string,
    argumentsValue: Readonly<Record<string, unknown>>,
): Promise<Readonly<Record<string, unknown>>> {
    const { isBootstrapPending, responseArguments } = await callStalwartJmapAllowingBootstrapMode(
        configuration,
        methodName,
        argumentsValue,
    );

    if (isBootstrapPending) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                The bundled Stalwart mail server has not finished its initial setup.

                Stalwart is still in **bootstrap mode**, so it answers the management method
                \`${methodName}\` with \`forbidden\` and no mail can be delivered yet.

                Agents Server completes this bootstrap on its own whenever it synchronizes the mail
                server - on startup and on **Synchronize Stalwart** - so this state means the
                bootstrap itself could not be finished. Inspect the \`stalwart\` service on this VPS
                and synchronize again.
            `),
        );
    }

    return responseArguments;
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
                      [STALWART_CREATE_REQUEST_KEY]: value,
                  },
              },
    );

    if (objectId) {
        const notUpdated = result.notUpdated as Record<string, unknown> | undefined;
        const updateRejection = notUpdated?.[objectId];
        if (updateRejection) {
            throw new UnexpectedError(
                spaceTrim(`
                    Stalwart refused to update the \`${objectName}\` object \`${objectId}\`.

                    **Reason:** \`${JSON.stringify(updateRejection).slice(0, 1_000)}\`
                `),
            );
        }
        return objectId;
    }

    const created = result.created as Record<string, { id?: unknown }> | undefined;
    const createdId = created?.[STALWART_CREATE_REQUEST_KEY]?.id;
    if (typeof createdId !== 'string') {
        const notCreated = result.notCreated as Record<string, unknown> | undefined;
        throw new UnexpectedError(
            spaceTrim(`
                Stalwart refused to create the \`${objectName}\` object.

                **Reason:** \`${JSON.stringify(notCreated?.[STALWART_CREATE_REQUEST_KEY] || result).slice(0, 1_000)}\`
            `),
        );
    }

    return createdId;
}
