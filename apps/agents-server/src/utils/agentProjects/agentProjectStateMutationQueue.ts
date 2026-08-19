/**
 * Global key used to keep one mutation queue per agent-project state file across module reloads.
 */
const AGENT_PROJECT_STATE_MUTATION_QUEUES_GLOBAL_KEY = '__PROMPTBOOK_AGENT_PROJECT_STATE_MUTATION_QUEUES__';

/**
 * Global object shape used for process-wide state-file mutation queues.
 */
type AgentProjectStateMutationQueuesGlobal = typeof globalThis & {
    [AGENT_PROJECT_STATE_MUTATION_QUEUES_GLOBAL_KEY]?: Map<string, Promise<void>>;
};

/**
 * Runs one agent-project state mutation after all previously queued mutations of the same state file finished.
 *
 * The project state files are read-modify-write JSON documents, so two concurrent mutations would
 * silently drop one of the two changes. Every mutation of one file goes through its own queue, while
 * mutations of unrelated files still run in parallel.
 *
 * @param queueName - Stable name of the mutated state file.
 * @param operation - Mutation to run exclusively for that state file.
 * @returns Whatever the mutation returns.
 */
export async function runAgentProjectStateMutation<TValue>(
    queueName: string,
    operation: () => Promise<TValue>,
): Promise<TValue> {
    const mutationQueues = getAgentProjectStateMutationQueues();
    const previousMutation = mutationQueues.get(queueName) ?? Promise.resolve();
    let releaseMutation!: () => void;

    mutationQueues.set(
        queueName,
        new Promise<void>((resolve) => {
            releaseMutation = resolve;
        }),
    );

    await previousMutation.catch(() => undefined);

    try {
        return await operation();
    } finally {
        releaseMutation();
    }
}

/**
 * Returns the process-wide mutation queues of all agent-project state files.
 *
 * @returns Mutable map of pending mutations keyed by state file name.
 */
function getAgentProjectStateMutationQueues(): Map<string, Promise<void>> {
    const mutationQueuesGlobal = globalThis as AgentProjectStateMutationQueuesGlobal;
    mutationQueuesGlobal[AGENT_PROJECT_STATE_MUTATION_QUEUES_GLOBAL_KEY] ??= new Map();

    return mutationQueuesGlobal[AGENT_PROJECT_STATE_MUTATION_QUEUES_GLOBAL_KEY]!;
}
