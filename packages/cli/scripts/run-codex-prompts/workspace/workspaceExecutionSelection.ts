import { readFile } from 'fs/promises';
import { join } from 'path';
import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import { THINKING_LEVEL_VALUES } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import { $checkHarnessInstallation } from '../../../src/cli/cli-commands/common/harness/$checkHarnessInstallation';
import type { HarnessProbeOptions } from '../../../src/cli/cli-commands/common/harness/$resolveInstalledHarnessVersion';
import { getHarnessDefinition } from '../../../src/cli/cli-commands/common/harness/HarnessDefinition';
import {
    PROMPT_RUNNER_HARNESS_NAMES,
    type PromptRunnerHarnessName,
} from '../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { normalizeToKebabCase } from '../../../src/utils/normalization/normalize-to-kebab-case';
import { resolveCoderAgentBook } from '../common/resolveCoderAgent';
import { resolveRunnerModel } from '../main/resolvePromptRunner';
import { extractPromptRunnerTokens, isPromptCompatibleWithRunner } from '../prompts/isPromptCompatibleWithRunner';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import type { WorkspaceAgentFile } from './workspaceAgentFiles';

/** Selection controls shared by autonomous jobs and workspace chat sessions. */
export type WorkspaceExecutionSelection = {
    readonly harness?: PromptRunnerHarnessName;
    readonly model?: string;
    readonly thinkingLevel?: ThinkingLevel;
};
/** Minimal versioned configuration; omission reuses environment and installed-harness selection. */
export type WorkspaceExecutionConfiguration = WorkspaceExecutionSelection & {
    readonly agents?: Readonly<Record<string, WorkspaceExecutionSelection>>;
};
/** A selected eligible agent is not a Cartesian product of agents and installed harnesses. */
export type WorkspaceTaskSelection = WorkspaceExecutionSelection & {
    readonly agent?: WorkspaceAgentFile;
    readonly reason?: string;
};

/** Loads project-local configuration without mutating the process environment or overwriting user settings. */
export async function loadWorkspaceExecutionConfiguration(
    projectPath: string,
    defaults: WorkspaceExecutionSelection = {},
): Promise<WorkspaceExecutionConfiguration> {
    const content = await readFile(join(projectPath, '.promptbook', 'config.json'), 'utf-8').catch(
        (error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return null;
            throw error;
        },
    );
    const configured = content ? ((JSON.parse(content).coder ?? {}) as WorkspaceExecutionConfiguration) : {};
    for (const selection of [defaults, configured, ...Object.values(configured.agents ?? {})]) {
        if (selection.harness && !PROMPT_RUNNER_HARNESS_NAMES.includes(selection.harness))
            throw new NotAllowed(`Unsupported configured harness \`${selection.harness}\` in .promptbook/config.json.`);
        if (selection.thinkingLevel && !THINKING_LEVEL_VALUES.includes(selection.thinkingLevel))
            throw new NotAllowed('Unsupported configured thinking level in .promptbook/config.json.');
    }
    return {
        ...configured,
        ...Object.fromEntries(Object.entries(defaults).filter(([, value]) => value !== undefined)),
    };
}

/** Checks installed adapters using the shared detector without installing, updating, or querying a model. */
export async function discoverWorkspaceHarnesses(options?: HarnessProbeOptions): Promise<PromptRunnerHarnessName[]> {
    const statuses = await Promise.all(
        PROMPT_RUNNER_HARNESS_NAMES.map((name) => $checkHarnessInstallation(getHarnessDefinition(name), false, options)),
    );
    return statuses.filter((status) => status.installedVersion !== null).map((status) => status.definition.harnessName);
}

/** Resolves explicit per-agent configuration before global defaults; an unavailable configured provider never falls back. */
export function selectWorkspaceAgentHarness(
    agent: WorkspaceAgentFile,
    configuration: WorkspaceExecutionConfiguration,
    available: ReadonlyArray<PromptRunnerHarnessName>,
): WorkspaceTaskSelection {
    const specific =
        configuration.agents?.[agent.id] ?? configuration.agents?.[agent.path] ?? configuration.agents?.[agent.name];
    const selection = { ...configuration, ...specific };
    const harness = selection.harness ?? available[0];
    if (!harness || !available.includes(harness))
        return {
            agent,
            ...selection,
            harness,
            reason: harness
                ? `Harness ${harness} is unavailable. Install/configure it; this agent will not switch provider.`
                : 'No installed harness. Install and configure a supported harness or set PTBK_HARNESS.',
        };
    return {
        agent,
        harness,
        model: resolveRunnerModel(harness, selection.model),
        thinkingLevel: selection.thinkingLevel,
    };
}

/**
 * Resolves existing backtick targeting syntax by dimension. Explicit Books and harness/model restrictions remain
 * authoritative; untargeted work goes only to Developer. Helpers and Planner never receive a broadcast queue.
 */
export async function selectWorkspaceTask(options: {
    readonly projectPath: string;
    readonly prompt: PromptSelection;
    readonly agents: ReadonlyArray<WorkspaceAgentFile>;
    readonly configuration: WorkspaceExecutionConfiguration;
    readonly availableHarnesses: ReadonlyArray<PromptRunnerHarnessName>;
    readonly agentFilter?: string;
}): Promise<WorkspaceTaskSelection> {
    const { prompt, agents, configuration, availableHarnesses, projectPath } = options;
    const line =
        prompt.section.statusLineIndex === undefined ? '' : prompt.file.lines[prompt.section.statusLineIndex] ?? '';
    const tokens = extractPromptRunnerTokens(line);
    const references = await Promise.all(
        agents
            .filter((agent) => !agent.error)
            .map(async (agent) => ({ agent, book: await resolveCoderAgentBook(agent.path, projectPath) })),
    );
    const matches = (token: string, names: ReadonlyArray<string>): boolean =>
        names.some((name) => normalizeToKebabCase(name).includes(normalizeToKebabCase(token)));
    const agentTokens = tokens.filter((token) =>
        references.some(({ book }) => matches(token, book?.agentReferences ?? [])),
    );
    const targeted = references.filter(({ book }) =>
        agentTokens.some((token) => matches(token, book?.agentReferences ?? [])),
    );
    if (targeted.length > 1) return { reason: 'Explicit Book target is ambiguous. Use a unique agent path or title.' };
    const selected = targeted[0] ?? references.find(({ agent }) => agent.path === 'agents/developer.book');
    if (!selected) return { reason: 'No valid Developer Book or resolved explicit agent target.' };
    if (options.agentFilter && !matches(options.agentFilter, selected.book?.agentReferences ?? []))
        return { agent: selected.agent, reason: 'Excluded by the explicit agent filter.' };
    const providerTokens = tokens.filter((token) => !agentTokens.includes(token));
    const specific =
        configuration.agents?.[selected.agent.id] ??
        configuration.agents?.[selected.agent.path] ??
        configuration.agents?.[selected.agent.name];
    const configuredHarness = specific?.harness ?? configuration.harness;
    const candidates = configuredHarness ? [configuredHarness] : PROMPT_RUNNER_HARNESS_NAMES;
    const compatible = candidates.filter((harness) =>
        providerTokens.every((token) =>
            matches(token, [harness, resolveRunnerModel(harness, specific?.model ?? configuration.model) ?? '']),
        ),
    );
    if (!compatible.length)
        return {
            agent: selected.agent,
            reason: `Unresolved or conflicting target: ${providerTokens.join(', ') || configuredHarness}.`,
        };
    const harness = compatible.find((candidate) => availableHarnesses.includes(candidate)) ?? compatible[0]!;
    const selection = selectWorkspaceAgentHarness(
        selected.agent,
        {
            ...configuration,
            harness,
            agents: { ...configuration.agents, [selected.agent.id]: { ...specific, harness } },
        },
        availableHarnesses,
    );
    if (
        !isPromptCompatibleWithRunner(prompt.file, prompt.section, {
            harnessName: harness,
            modelName: selection.model,
            agentReferences: selected.book?.agentReferences,
        })
    )
        return { ...selection, reason: 'PRD does not match its configured execution target.' };
    return selection;
}

// Note: [🟡] Workspace selection is only published in `@promptbook/cli`.
// Note: [💞] Ignore a discrepancy between file name and exported helper names
