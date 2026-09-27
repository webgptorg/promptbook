import type { CoderTeamScope } from '../../../../../scripts/run-codex-prompts/team/CoderTeamRuntime';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import { parsePlanningReply, type PlanningMessage, type PlanningReply } from './planningProtocol';
import { readPlanningContext } from './readPlanningContext';

/** Maximum inference/read cycles in one user or adviser turn. */
const MAX_PLANNING_INSPECTION_ROUNDS = 12;

/**
 * Runs the same read-only protocol throughout the delegation tree. Only the primary caller can receive proposals.
 * @private internal utility of `coder plan`
 */
export async function discussPlanningTurn(options: {
    readonly projectPath: string;
    readonly history: PlanningMessage[];
    readonly signal: AbortSignal;
    readonly infer: () => Promise<string>;
    readonly team?: CoderTeamScope;
    readonly isAdviser?: boolean;
    readonly write?: (message: string) => void;
}): Promise<PlanningReply> {
    for (let round = 0; round < MAX_PLANNING_INSPECTION_ROUNDS; round++) {
        if (options.signal.aborted) throw new NotAllowed(spaceTrim('Planning cancelled.'));
        const output = await options.infer();
        await options.team?.activity({ response: output });
        const reply = parsePlanningReply(output);
        options.signal.throwIfAborted();
        if (options.isAdviser && reply.proposals.length) {
            throw new NotAllowed(
                spaceTrim('TEAM advisers cannot propose writes. Return advice to the primary Planner.'),
            );
        }
        options.history.push({ role: 'planner', content: JSON.stringify(reply) });
        if (!reply.reads.length) return reply;
        for (const request of reply.reads) {
            options.signal.throwIfAborted();
            let result: unknown;
            if (request.kind === 'team') {
                if (!options.team)
                    throw new NotAllowed(spaceTrim('TEAM tools are unavailable in this planning invocation.'));
                result = await options.team.call(request.toolName, {
                    message: request.message,
                    context: request.context,
                });
            } else {
                options.write?.(`Reading ${request.kind === 'git' ? `Git ${request.operation}` : request.path}`);
                result = await readPlanningContext(options.projectPath, request).catch(
                    (error: Error) => `Read refused: ${error.message}`,
                );
            }
            await options.team?.activity({ request, result });
            options.history.push({ role: 'context', content: JSON.stringify({ request, result }) });
        }
    }
    throw new NotAllowed(
        spaceTrim(
            'Planner exceeded the repository-inspection limit. No proposed changes were saved; narrow the request and try again.',
        ),
    );
}
