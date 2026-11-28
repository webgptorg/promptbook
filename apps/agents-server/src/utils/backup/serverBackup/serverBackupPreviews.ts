import type { AgentRow, BackupAgentPreview, BackupUserPreview, UserRow } from './serverBackupTypes';

/**
 * Builds the user preview map reused across metadata sidecars.
 *
 * @param users - Full user rows.
 * @returns User preview map keyed by numeric id.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createUserPreviewById(users: ReadonlyArray<UserRow>): Map<number, BackupUserPreview> {
    return new Map(
        users.map((user) => [
            user.id,
            {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin,
                profileImageUrl: user.profileImageUrl,
            } satisfies BackupUserPreview,
        ] as const),
    );
}

/**
 * Builds the agent preview map keyed by numeric id.
 *
 * @param agents - Full agent rows.
 * @returns Agent preview map keyed by numeric id.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createAgentPreviewById(agents: ReadonlyArray<AgentRow>): Map<number, BackupAgentPreview> {
    return new Map(
        agents.map((agent) => [
            agent.id,
            {
                id: agent.id,
                agentName: agent.agentName,
                permanentId: agent.permanentId,
            } satisfies BackupAgentPreview,
        ] as const),
    );
}

/**
 * Builds the agent preview map keyed by permanent id.
 *
 * @param agents - Full agent rows.
 * @returns Agent preview map keyed by permanent id.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createAgentPreviewByPermanentId(agents: ReadonlyArray<AgentRow>): Map<string, BackupAgentPreview> {
    return new Map(
        agents.flatMap((agent) =>
            agent.permanentId
                ? [
                      [
                          agent.permanentId,
                          {
                              id: agent.id,
                              agentName: agent.agentName,
                              permanentId: agent.permanentId,
                          } satisfies BackupAgentPreview,
                      ] as const,
                  ]
                : [],
        ),
    );
}

/**
 * Builds the first-agent-by-name preview map used by feedback sidecars.
 *
 * @param agents - Full agent rows.
 * @returns Agent preview map keyed by agent name.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createAgentPreviewByName(agents: ReadonlyArray<AgentRow>): Map<string, BackupAgentPreview> {
    const agentPreviewByName = new Map<string, BackupAgentPreview>();

    for (const agent of agents) {
        if (agentPreviewByName.has(agent.agentName)) {
            continue;
        }

        agentPreviewByName.set(agent.agentName, {
            id: agent.id,
            agentName: agent.agentName,
            permanentId: agent.permanentId,
        });
    }

    return agentPreviewByName;
}
