import { spawn } from 'child_process';
import { stat } from 'fs/promises';
import { dirname, join } from 'path';
import { createInterface } from 'readline';
import { $terminateOwnedProcessTree } from '../../../../utils/execCommand/$terminateOwnedProcessTree';
import { buildCodexUsageFromOutput } from '../../../../../scripts/run-codex-prompts/runners/openai-codex/buildCodexUsageFromOutput';
import type { Usage } from '../../../../execution/Usage';
import { UNCERTAIN_USAGE } from '../../../../execution/utils/usage-constants';
import { PipelineExecutionError } from '../../../../errors/PipelineExecutionError';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import { $resolveHarnessCommandPath } from '../../common/harness/$resolveHarnessCommandPath';
import { getHarnessDefinition } from '../../common/harness/HarnessDefinition';
import { HARNESS_DEFAULT_MODELS } from '../../common/harness/HARNESS_DEFAULT_MODELS';
import type { NormalizedPromptRunnerSelectionCliOptions } from '../../common/promptRunnerCliOptions';
import { PLANNING_RESPONSE_SCHEMA_FILENAME } from './createPlanningWorkspace';

/** Capabilities excluded from the planning process independently of any Book or prompt. */
const DISABLED_PLANNING_FEATURES = [
    'shell_tool',
    'unified_exec',
    'multi_agent',
    'multi_agent_v2',
    'apps',
    'plugins',
    'hooks',
    'browser_use',
    'computer_use',
    'image_generation',
    'code_mode',
    'code_mode_host',
    'request_permissions_tool',
    'memories',
    'skill_mcp_dependency_install',
    'remote_plugin',
    'workspace_dependencies',
    'shell_snapshot',
    'skill_search',
    'tool_suggest',
];
/** Maximum duration of one inference; errors never enter the implementation runner's retry loop. */
const PLANNING_TURN_TIMEOUT_MS = 5 * 60 * 1000;

/** Bounded diagnostic tail retained when a harness fails. */
const MAX_DIAGNOSTIC_LENGTH = 8000;

/** Maximum raw output, including malformed streams that never terminate a JSON line. */
const MAX_PLANNING_OUTPUT_BYTES = 2 * 1024 * 1024;

/**
 * Parameters for one tool-restricted inference. Repository reads and PRD writes are host operations.
 * @private internal type of `coder plan`
 */
export type PlanningHarnessOptions = NormalizedPromptRunnerSelectionCliOptions & {
    readonly workspacePath: string;
    readonly prompt: string;
    readonly signal: AbortSignal;
    /** Reports available usage from this inference once, including turns whose final answer is malformed. */
    readonly onUsage?: (usage: Usage) => void;
};

/**
 * Rejects harnesses without a planning execution policy before any Git sync or process launch.
 * @private internal utility of `coder plan`
 */
export function assertPlanningHarnessSupported(harness: string | undefined): void {
    if (harness !== 'openai-codex') {
        throw new NotAllowed(
            spaceTrim(
                'Planning currently supports `--harness openai-codex` only. Other harnesses have no enforced planning tool boundary.',
            ),
        );
    }
}

/**
 * Constructs a fail-closed Codex invocation. User config, rules, project config discovery, native shell,
 * connectors, hooks and delegation cannot expand the planning tool set. Read-only sandboxing also denies patches.
 * Older Codex versions that do not support these switches fail instead of using the implementation runner.
 * @private internal utility of `coder plan`
 */
export function buildPlanningHarnessArguments(options: PlanningHarnessOptions): string[] {
    const model = options.model === 'default' ? undefined : options.model || HARNESS_DEFAULT_MODELS['openai-codex'];
    return [
        '--ask-for-approval',
        'never',
        'exec',
        '--sandbox',
        'read-only',
        '--ephemeral',
        '--ignore-user-config',
        '--ignore-rules',
        '--skip-git-repo-check',
        '--json',
        '--output-schema',
        join(options.workspacePath, PLANNING_RESPONSE_SCHEMA_FILENAME),
        '--color',
        'never',
        '-C',
        options.workspacePath,
        '-c',
        'project_root_markers=[".git"]',
        '-c',
        'web_search="disabled"',
        '-c',
        'mcp_servers={}',
        '-c',
        'project_doc_max_bytes=0',
        ...DISABLED_PLANNING_FEATURES.flatMap((feature) => ['--disable', feature]),
        ...(!options.allowCredits ? ['-c', 'forced_login_method="chatgpt"'] : []),
        ...(model ? ['--model', model] : []),
        ...(options.thinkingLevel ? ['-c', `model_reasoning_effort=${JSON.stringify(options.thinkingLevel)}`] : []),
        '-',
    ];
}

/**
 * Runs a bounded inference with no shell interpolation and consumes only its final JSON answer.
 * @private internal utility of `coder plan`
 */
export async function runPlanningHarness(options: PlanningHarnessOptions): Promise<string> {
    assertPlanningHarnessSupported(options.agentName);
    const command = await resolvePlanningHarnessCommand();
    if (options.signal.aborted) throw new NotAllowed(spaceTrim('Planning cancelled.'));
    return new Promise((resolve, reject) => {
        const environment = { ...process.env };
        // Config is isolated, but Codex still uses its normal authentication store. Do not source project .env files.
        if (!options.allowCredits) {
            delete environment.OPENAI_API_KEY;
            delete environment.OPENAI_BASE_URL;
            delete environment.CODEX_API_KEY;
        }
        const child = spawn(command.executable, [...command.arguments, ...buildPlanningHarnessArguments(options)], {
            cwd: options.workspacePath,
            env: environment,
            stdio: 'pipe',
            shell: false,
            windowsHide: true,
            detached: process.platform !== 'win32',
        });
        const reader = createInterface({ input: child.stdout });
        let answer = '';
        let diagnostics = '';
        let outputSize = 0;
        let isSettled = false;
        let isHarnessFailed = false;
        let usageEvent: string | undefined;
        /** Finishes exactly once and terminates only this harness process tree. */
        const finish = (error?: Error): void => {
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timeout);
            options.signal.removeEventListener('abort', cancel);
            reader.close();
            options.onUsage?.(usageEvent ? buildCodexUsageFromOutput(usageEvent, options.model) : UNCERTAIN_USAGE);
            if (error) {
                $terminateOwnedProcessTree(child, process.platform !== 'win32');
                reject(error);
            } else resolve(answer);
        };
        /** Cancels inference before any host write can be proposed. */
        const cancel = (): void => finish(new NotAllowed(spaceTrim('Planning cancelled. Saved PRDs are unchanged.')));
        const timeout = setTimeout(
            () =>
                finish(
                    new PipelineExecutionError(spaceTrim('Planner harness timed out. No proposed changes were saved.')),
                ),
            PLANNING_TURN_TIMEOUT_MS,
        );
        options.signal.addEventListener('abort', cancel, { once: true });
        child.stdout.on('data', (data: Buffer) => {
            outputSize += data.length;
            if (outputSize > MAX_PLANNING_OUTPUT_BYTES) {
                finish(new PipelineExecutionError(spaceTrim('Planner output exceeded the session limit.')));
            }
        });
        child.stderr.on('data', (data: Buffer) => {
            diagnostics = (diagnostics + data.toString()).slice(-MAX_DIAGNOSTIC_LENGTH);
        });
        child.stdin.on('error', (error) =>
            finish(new PipelineExecutionError(spaceTrim(`Planner harness input failed: ${error.message}`))),
        );
        child.on('error', (error) =>
            finish(
                new PipelineExecutionError(
                    spaceTrim(`Cannot start Codex: ${error.message}. Install and sign in to Codex before planning.`),
                ),
            ),
        );
        child.on('close', (code) =>
            finish(
                code === 0 && answer && !isHarnessFailed
                    ? undefined
                    : new PipelineExecutionError(
                          spaceTrim(
                              `Planner harness failed (${code}). No proposed changes were saved. Use a Codex version supporting --ignore-user-config and --ignore-rules.\n${diagnostics}`,
                          ),
                      ),
            ),
        );
        reader.on('line', (line) => {
            if (isSettled) return;
            try {
                const event = JSON.parse(line);
                if (event.type === 'turn.completed' && event.usage) usageEvent = line;
                if (event.type === 'item.completed' && event.item?.type === 'agent_message') answer = event.item.text;
                if (event.type === 'turn.failed' || event.type === 'error') {
                    isHarnessFailed = true;
                    diagnostics = JSON.stringify(event);
                }
            } catch {
                /* Non-JSON diagnostics never become executable instructions. */
            }
        });
        child.stdin.end(options.prompt);
    });
}

/** Resolves npm Windows shims to their JavaScript entrypoint so all model text stays off the command line. */
async function resolvePlanningHarnessCommand(): Promise<{ executable: string; arguments: string[] }> {
    const path = await $resolveHarnessCommandPath(getHarnessDefinition('openai-codex'));
    if (!path)
        throw new NotAllowed(
            spaceTrim('Codex is not installed. Install and sign in to Codex, then retry `ptbk coder plan`.'),
        );
    if (process.platform !== 'win32' || path.toLowerCase().endsWith('.exe')) return { executable: path, arguments: [] };
    const entrypoint = join(dirname(path), 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (
        await stat(entrypoint).then(
            (entry) => entry.isFile(),
            () => false,
        )
    ) {
        return { executable: process.execPath, arguments: [entrypoint] };
    }
    throw new NotAllowed(
        spaceTrim(
            'Planning needs the native Codex executable or its standard npm installation on Windows; shell shims cannot enforce argument isolation.',
        ),
    );
}
