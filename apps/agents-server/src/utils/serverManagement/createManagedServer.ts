import type { ChatFeedbackMode } from '../chatFeedbackMode';
import type { ServerEnvironment, ServerRecord } from '../serverRegistry';
import { bootstrapManagedServer } from './createManagedServer/bootstrapManagedServer';
import { createFailedServerResult } from './createManagedServer/createFailedServerResult';
import { normalizeCreateServerInput } from './createManagedServer/normalizeCreateServerInput';

/**
 * User row requested by the create-server wizard.
 */
export type ServerSeedUserInput = {
    /**
     * Username that will be created inside the spawned server.
     */
    readonly username: string;

    /**
     * Plain-text password for the new user.
     */
    readonly password: string;

    /**
     * Whether the user should have admin access inside the spawned server.
     */
    readonly isAdmin?: boolean;
};

/**
 * Initial metadata choices collected by the create-server wizard.
 */
export type CreateServerInitialSettings = {
    /**
     * Default UI language for the new server.
     */
    readonly language: string;

    /**
     * Optional homepage markdown message.
     */
    readonly homepageMessage: string;

    /**
     * Feedback mode used in chats after assistant responses.
     */
    readonly feedbackMode?: ChatFeedbackMode;

    /**
     * Legacy feedback toggle kept for backwards compatibility with older wizard payloads.
     */
    readonly isFeedbackEnabled?: boolean;

    /**
     * Whether chat file attachments should be enabled.
     */
    readonly isFileAttachmentsEnabled: boolean;

    /**
     * Whether the install-as-app option should be enabled.
     */
    readonly isExperimentalPwaAppEnabled: boolean;

    /**
     * Whether the footer should be shown.
     */
    readonly isFooterShown: boolean;
};

/**
 * Payload accepted by the create-server bootstrap workflow.
 */
export type CreateServerInput = {
    /**
     * Friendly name stored in `_Server.name` and `SERVER_NAME`.
     */
    readonly name: string;

    /**
     * Stable slug used to derive the default table prefix.
     */
    readonly identifier: string;

    /**
     * Environment group used by migrations and operations.
     */
    readonly environment: ServerEnvironment;

    /**
     * Public domain assigned to the new server.
     */
    readonly domain: string;

    /**
     * Prefix used for the new server tables.
     */
    readonly tablePrefix: string;

    /**
     * Optional uploaded server icon URL.
     */
    readonly iconUrl?: string | null;

    /**
     * Mandatory first admin account created inside the new server.
     */
    readonly adminUser: ServerSeedUserInput;

    /**
     * Optional extra users created during bootstrap.
     */
    readonly additionalUsers?: ReadonlyArray<ServerSeedUserInput>;

    /**
     * Initial metadata values for the new server.
     */
    readonly initialSettings: CreateServerInitialSettings;
};

/**
 * Successful create-server result returned to the API layer.
 */
export type CreateServerSuccess = {
    /**
     * Newly created server row.
     */
    readonly server: ServerRecord;

    /**
     * Public URL for opening the new server.
     */
    readonly publicUrl: string;
};

/**
 * Failed create-server result returned to the API layer.
 */
export type CreateServerFailure = {
    /**
     * HTTP-style status code suitable for the API response.
     */
    readonly status: number;

    /**
     * User-facing error message.
     */
    readonly message: string;

    /**
     * SQL script representing the attempted bootstrap transaction.
     */
    readonly sqlDump: string | null;

    /**
     * Suggested filename for downloading the SQL dump.
     */
    readonly sqlFilename: string | null;
};

/**
 * Result of attempting to create a new server.
 */
export type CreateServerResult =
    | (CreateServerSuccess & {
          readonly ok: true;
      })
    | (CreateServerFailure & {
          readonly ok: false;
      });

/**
 * Creates a new registered server, runs migrations for its prefix, and seeds users/metadata in one transaction.
 *
 * @param input - Create-server payload from the wizard.
 * @returns Success result or a failure payload containing the attempted SQL dump.
 */
export async function createManagedServer(input: CreateServerInput): Promise<CreateServerResult> {
    try {
        return await bootstrapManagedServer(normalizeCreateServerInput(input));
    } catch (error) {
        return createFailedServerResult(error, null, null);
    }
}
