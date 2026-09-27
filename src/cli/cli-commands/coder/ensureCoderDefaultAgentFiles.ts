import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { ADAM_AGENT_BOOK_RELATIVE_PATH, ensureAdamAgentBook } from '../common/ensureAdamAgentBook';
import { augmentCoderAgentTeam } from './augmentCoderAgentTeam';
import type { EnsuredCoderReferencedArtifact } from './coderReferencedArtifacts';
import { ensureCoderRoleAgentFile } from './ensureCoderRoleAgentFile';
import { readCoderAgentBook } from './readCoderAgentBook';

/** Project-owned roles created independently of package-script changes. */
const CODER_DEFAULT_ROLES = ['developer', 'planner', 'lawyer', 'copywriter'] as const;

/**
 * Ensures every default Book independently, then adds missing helper declarations to the two primary roles.
 * A failure leaves the affected Book intact and does not prevent the remaining files from being initialized.
 *
 * @private internal utility of `coder init`
 */
export async function ensureCoderDefaultAgentFiles(projectPath: string): Promise<EnsuredCoderReferencedArtifact[]> {
    const artifacts: EnsuredCoderReferencedArtifact[] = [];
    const definitions = [
        {
            relativeFilePath: `agents/${ADAM_AGENT_BOOK_RELATIVE_PATH}`,
            ensureFile: () => ensureAdamAgentBook(join(projectPath, 'agents')),
        },
        ...CODER_DEFAULT_ROLES.map((role) => ({
            relativeFilePath: `agents/${role}.book`,
            ensureFile: () => ensureCoderRoleAgentFile(projectPath, role),
        })),
    ];
    for (const { relativeFilePath, ensureFile } of definitions) {
        try {
            const filePath = join(projectPath, relativeFilePath);
            let status: EnsuredCoderReferencedArtifact['status'] = 'unchanged';
            try {
                await readCoderAgentBook(filePath);
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
                status = await ensureFile();
                await readCoderAgentBook(filePath);
            }
            artifacts.push({ relativeFilePath, status });
        } catch (error) {
            artifacts.push({ relativeFilePath, status: 'unresolved', diagnostic: describeInitializationError(error) });
        }
    }

    const unresolvedDependencies = artifacts.filter(
        ({ relativeFilePath, status }) =>
            status === 'unresolved' && !['agents/developer.book', 'agents/planner.book'].includes(relativeFilePath),
    );
    for (const role of ['developer', 'planner'] as const) {
        const index = artifacts.findIndex(({ relativeFilePath }) => relativeFilePath === `agents/${role}.book`);
        const artifact = artifacts[index]!;
        if (artifact.status === 'unresolved') continue;
        try {
            if (unresolvedDependencies.length > 0) {
                artifacts[index] = {
                    ...artifact,
                    status: 'unresolved',
                    diagnostic: spaceTrim(
                        `Default TEAM references could not be checked or added because these Books are unresolved: ${unresolvedDependencies
                            .map(({ relativeFilePath }) => `\`${relativeFilePath}\``)
                            .join(', ')}. Existing content was preserved.`,
                    ),
                };
                continue;
            }
            const teamStatus = await augmentCoderAgentTeam(projectPath, role);
            if (teamStatus === 'augmented' && artifact.status !== 'created') {
                artifacts[index] = { ...artifact, status: teamStatus };
            }
        } catch (error) {
            artifacts[index] = {
                ...artifact,
                status: 'unresolved',
                diagnostic: spaceTrim(
                    `Default TEAM references could not be safely added; existing content was preserved. ${describeInitializationError(
                        error,
                    )}`,
                ),
            };
        }
    }
    return artifacts;
}

/** Retains filesystem error codes and Book diagnostics in the per-artifact initialization report. */
function describeInitializationError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
