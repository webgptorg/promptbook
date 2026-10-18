import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EXIT, PtbkError } from '../../common/errors.js';
import { ensureDirectory, listDirectory, toProjectRelative } from '../../common/fs.js';
import { shortId, shortHash } from '../../common/ids.js';
import { formatAgentReference } from '../../book/references.js';
import { AgentCatalog, resolveEffectiveAgent } from '../../project/agents.js';
import { loadSettings, setting } from '../../project/config.js';
import { commitPaths, inspectGit } from '../../project/git.js';
import { harnessPlugin } from '../../harness/registry.js';
import { runHarness } from '../../harness/run.js';
import { ToolBridge } from '../../engine/bridge.js';
import { HarnessPool } from '../../engine/harnesses.js';
import { renderAgentInstructions } from '../../engine/prompt.js';
import { teamTools } from '../../engine/team.js';
import { newTaskPath, renderTaskBook } from '../../tasks/authoring.js';
import { CANCELLED, composeText, confirm } from '../../ui/prompts.js';
import { generatedTaskName, selectedProject, writableTasksDirectory } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * Time limit of one planning inference.
 */
const PLANNING_TIMEOUT_MS = 5 * 60_000;

/**
 * Output limit of one planning inference.
 */
const PLANNING_OUTPUT_LIMIT = 2 * 1024 * 1024;

/**
 * A proposed task.
 */
type Proposal = { readonly title: string; readonly description: string; readonly agent?: string; readonly priority?: number };

/**
 * Extracts the latest proposal block from a planner answer.
 */
function parseProposals(text: string): Proposal[] | undefined {
    const blocks = [...text.matchAll(/```ptbk-tasks\s*\n([\s\S]*?)```/g)];
    const last = blocks[blocks.length - 1]?.[1];
    if (!last) return undefined;
    try {
        const value = JSON.parse(last) as unknown;
        if (!Array.isArray(value)) return undefined;
        return value
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && typeof (item as Record<string, unknown>).title === 'string')
            .map((item) => ({
                title: String(item.title).trim(),
                description: typeof item.description === 'string' ? item.description.trim() : '',
                agent: typeof item.agent === 'string' && item.agent.trim() ? item.agent.trim() : undefined,
                priority: typeof item.priority === 'number' && item.priority >= 0 ? item.priority : undefined,
            }))
            .filter((item) => item.title);
    } catch {
        return undefined;
    }
}

/**
 * Fingerprint of the task directory used to reject stale previews.
 */
async function directoryFingerprint(directory: string): Promise<string> {
    return shortHash((await listDirectory(directory)).map((entry) => entry.name).join('\n'));
}

/**
 * `ptbk plan`: read-only planning conversation; only reviewed proposals are saved (and committed).
 *
 * @private command
 */
export default async function plan(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const { terminal } = context;
    const harness = option<string>(context, 'harness') ?? setting<string | undefined>(settings, 'routing.harness');
    const plugin = harness ? harnessPlugin(harness) : undefined;
    if (!plugin) throw new PtbkError('Select a harness for planning with --harness.', { kind: 'usage' });
    if (!plugin.capabilities.readOnly) {
        throw new PtbkError(`${plugin.displayName} cannot enforce read-only planning, so ptbk refuses to plan with it.`, { kind: 'unsupported', next: ['Use `--harness openai-codex` (the supported baseline) or `--harness claude-code`.'] });
    }
    const inspection = await plugin.inspect({ projectRoot: project.root, env: context.env });
    if (!inspection.usable) throw new PtbkError(`${plugin.displayName} is not usable.`, { kind: 'setup', reason: inspection.summary, next: inspection.nextAction ? [inspection.nextAction] : [] });
    const catalog = await AgentCatalog.load(project.root, setting<string>(settings, 'paths.agents'));
    const requested = option<string>(context, 'agent') ?? setting<string>(settings, 'routing.defaultAgent');
    const agent = await resolveEffectiveAgent(catalog, requested.startsWith('@') || requested.startsWith('{') ? requested : `{{${requested}}}`);
    if (agent.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) throw new PtbkError(`Agent ${requested} cannot plan.`, { kind: 'configuration', reason: agent.diagnostics.map((diagnostic) => diagnostic.message).join(' ') });
    const tasksDirectory = await writableTasksDirectory(context, project, settings);
    const agents = catalog.ordinary().map((definition) => formatAgentReference(definition.name));
    const transcript: Array<{ role: 'You' | 'Planner'; text: string }> = [];
    let proposals: Proposal[] = [];
    const pool = new HarnessPool(project.root, settings, context.env);
    await pool.refresh([plugin.id], true);
    const turn = async (message: string): Promise<void> => {
        transcript.push({ role: 'You', text: message });
        const prompt = [
            `# Planning conversation\n\nYou are **${agent.name}**, planning work for the project at \`${project.root}\` with its owner. You are strictly read-only: inspect files if useful, but never modify anything and never run write operations.`,
            `## Your role\n\n${renderAgentInstructions(agent)}`,
            `## Project agents\n\n${agents.join(', ') || '(none)'}`,
            `## Conversation so far\n\n${transcript.map((entry) => `**${entry.role}:** ${entry.text}`).join('\n\n')}`,
            '## How to answer\n\nDiscuss briefly. When you propose tasks, end your answer with one fenced block:\n\n```ptbk-tasks\n[{"title":"…","description":"intended result and constraints","agent":"@Developer","priority":1}]\n```\n\nTasks describe outcomes, not every implementation step. Do not implement anything.',
        ].join('\n\n');
        const directory = await ensureDirectory(project.runtime.temporary);
        const promptFile = join(directory, `plan-${shortId()}.md`);
        await writeFile(promptFile, prompt);
        const tools = plugin.capabilities.mcp
            ? teamTools(
                  {
                      project,
                      catalog,
                      pool,
                      settings,
                      task: { ref: 'planning', title: 'Planning conversation' },
                      agentName: agent.name,
                      harness: plugin.id,
                      depth: 0,
                      budget: { calls: 0 },
                      questionsAllowed: false,
                      signal: new AbortController().signal,
                      onUserChat: () => undefined,
                      onActivity: (text) => terminal.write(terminal.style.muted(`  · ${text}\n`)),
                  },
                  { includeUser: false },
              )
            : [];
        const bridge = tools.length ? await ToolBridge.start(tools) : undefined;
        terminal.write(terminal.style.muted(`${agent.name} is thinking (read-only, ${plugin.displayName})…\n`));
        try {
            const result = await runHarness(
                plugin,
                { projectRoot: project.root, cwd: project.root, prompt, promptFile, readOnly: true, mcp: bridge?.launch(), env: context.env, timeoutMs: PLANNING_TIMEOUT_MS, allowCredits: false, authentication: inspection.authentication, readableDirectories: [] },
                inspection.executablePath ?? plugin.executable,
            );
            if (result.outcome !== 'completed') {
                terminal.write(`${terminal.style.error('Planning turn failed:')} ${result.diagnostic}\n`);
                return;
            }
            const answer = result.finalMessage.slice(0, PLANNING_OUTPUT_LIMIT);
            transcript.push({ role: 'Planner', text: answer });
            terminal.write(`\n${answer.replace(/```ptbk-tasks[\s\S]*?```/g, '').trim()}\n`);
            const parsed = parseProposals(answer);
            if (parsed) proposals = parsed;
            if (proposals.length) {
                terminal.write(`\n${terminal.style.bold(`Proposed tasks (${proposals.length}):`)}\n`);
                proposals.forEach((proposal, index) => terminal.write(`  ${index + 1}. ${proposal.title}${proposal.agent ? terminal.style.muted(` · ${proposal.agent}`) : ''}${proposal.priority ? terminal.style.muted(` · P${proposal.priority}`) : ''}\n`));
                terminal.write(terminal.style.muted('  /save saves them as ready tasks · /draft saves them as not ready · /discard drops them\n'));
            }
        } finally {
            await bridge?.close();
            await rm(promptFile, { force: true });
        }
    };
    const save = async (draft: boolean): Promise<void> => {
        if (!proposals.length) {
            terminal.write('There are no proposals to save.\n');
            return;
        }
        const fingerprint = await directoryFingerprint(tasksDirectory);
        const files: Array<{ path: string; title: string; content: string }> = [];
        for (const proposal of proposals) {
            const commitments: string[] = [];
            if (proposal.agent) commitments.push(`TASK AGENT ${proposal.agent}`);
            if (proposal.priority !== undefined) commitments.push(`TASK PRIORITY ${proposal.priority}`);
            if (draft) commitments.push('TASK STATUS not-ready');
            commitments.push('TASK ORIGIN planning');
            let path = await newTaskPath(tasksDirectory, proposal.title, Date.now(), setting<string>(settings, 'timezone'));
            while (files.some((file) => file.path === path)) path = path.replace(/\.book$/, `-${shortId(3)}.book`);
            const title = await generatedTaskName(project, settings, proposal.title, files.map((file) => file.title));
            files.push({ path, title, content: renderTaskBook({ title, description: proposal.description, commitments }) });
        }
        for (const file of files) terminal.write(`\n${terminal.style.bold(toProjectRelative(project.root, file.path))}\n${file.content}`);
        const commit = flag(context, 'commit') ?? setting<boolean>(settings, 'execution.commit');
        if ((await confirm(terminal, { frame: { title: 'ptbk plan', step: 'Save' }, question: `Save these ${files.length} ${draft ? 'draft ' : ''}task(s)${commit ? ' and commit them' : ' without committing'}?`, defaultYes: true })) !== true) return;
        if ((await directoryFingerprint(tasksDirectory)) !== fingerprint) {
            terminal.write(terminal.style.warning('The task folder changed since the preview; run /save again to review the current state.\n'));
            return;
        }
        await ensureDirectory(tasksDirectory);
        for (const file of files) await writeFile(file.path, file.content, { flag: 'wx' });
        const gitInfo = await inspectGit(project.root);
        if (commit && gitInfo.state === 'repository') {
            const outcome = await commitPaths({
                projectRoot: project.root,
                repositoryRoot: gitInfo.root,
                paths: files.map((file) => file.path),
                subject: `Add ${files.length} planned task${files.length === 1 ? '' : 's'}`,
                trailers: { 'Task-Name': files.map((file) => file.title) },
                temporaryDirectory: project.runtime.temporary,
                env: context.env,
            });
            terminal.write(`Saved and committed ${outcome.committed ? outcome.sha.slice(0, 8) : ''}.\n`);
        } else terminal.write(`Saved ${files.length} file(s) without committing (--no-commit); a default \`ptbk start\` will wait until you commit them.\n`);
        proposals = [];
    };
    let first = context.positionals.join(' ').trim();
    if (!terminal.interactive) {
        if (!first) throw new PtbkError('Non-interactive planning needs a message argument.', { kind: 'usage' });
        await turn(first);
        terminal.write('Proposals were not saved (run `ptbk plan` interactively to review and /save them).\n');
        return EXIT.success;
    }
    terminal.write(terminal.style.muted(`Planning with ${agent.name} on ${plugin.displayName} (read-only). Commands: /save /draft /discard /exit\n`));
    for (;;) {
        let message = first;
        first = '';
        if (!message) {
            const value = await composeText(terminal, { frame: { title: 'ptbk plan', step: `${agent.name} · read-only` }, question: 'You:', placeholder: 'Describe what you want to achieve, or /save /draft /discard /exit', required: true });
            if (value === CANCELLED) {
                if (proposals.length) terminal.write('Unsaved proposals were discarded.\n');
                return EXIT.success;
            }
            message = value.trim();
        }
        if (message === '/exit') {
            if (proposals.length) terminal.write('Unsaved proposals were discarded.\n');
            return EXIT.success;
        }
        if (message === '/save' || message === '/draft') await save(message === '/draft');
        else if (message === '/discard') {
            proposals = [];
            terminal.write('Proposals discarded.\n');
        } else await turn(message);
    }
}
