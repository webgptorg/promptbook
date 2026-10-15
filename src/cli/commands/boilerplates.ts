import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EXIT, PtbkError, usageError } from '../../common/errors.js';
import { ensureDirectory, pathExists, toProjectRelative } from '../../common/fs.js';
import { loadSettings, setting } from '../../project/config.js';
import { commitPaths, inspectGit } from '../../project/git.js';
import { newTaskPath } from '../../tasks/authoring.js';
import { selectedProject, writableTasksDirectory } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * `ptbk generate-boilerplates`: unfinished, non-runnable placeholders (`@@@`) to fill in later.
 *
 * @private command
 */
export default async function generateBoilerplates(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const tasksDirectory = await writableTasksDirectory(context, project, settings);
    const match = /^(\d+)(?:\*(\d+))?$/.exec(option<string>(context, 'count') ?? '5*1');
    if (!match) throw usageError('--count must be N or N*M, e.g. 5 or 3*2.', 'generate-boilerplates');
    const files = Number(match[1]);
    const sections = Number(match[2] ?? 1);
    if (files < 1 || sections < 1 || files > 100 || sections > 50) throw usageError('--count must be between 1 and 100 files and 1 to 50 sections.', 'generate-boilerplates');
    const templateName = option<string>(context, 'template');
    let template = 'TASK @@@\n\n@@@\n';
    if (templateName) {
        const path = join(tasksDirectory, 'templates', templateName.endsWith('.book') ? templateName : `${templateName}.book`);
        if (!(await pathExists(path))) throw new PtbkError(`Template ${templateName} does not exist.`, { kind: 'usage' });
        template = await readFile(path, 'utf8');
    }
    await ensureDirectory(tasksDirectory);
    const created: string[] = [];
    const timeZone = setting<string>(settings, 'timezone');
    for (let index = 0; index < files; index++) {
        if (sections === 1) {
            const path = await newTaskPath(tasksDirectory, `boilerplate ${index + 1}`, Date.now(), timeZone);
            await writeFile(path, template.includes('@@@') ? template : `TASK @@@\n\n${template}`, { flag: 'wx' });
            created.push(path);
        } else {
            const path = await newTaskPath(tasksDirectory, `boilerplate ${index + 1}`, Date.now(), timeZone, '.md');
            await writeFile(path, `${Array.from({ length: sections }, () => '[ ]\n\n@@@\n').join('\n---\n\n')}`, { flag: 'wx' });
            created.push(path);
        }
    }
    const commit = flag(context, 'commit') ?? setting<boolean>(settings, 'execution.commit');
    const gitInfo = await inspectGit(project.root);
    let sha: string | undefined;
    if (commit && gitInfo.state === 'repository') {
        const outcome = await commitPaths({ projectRoot: project.root, repositoryRoot: gitInfo.root, paths: created, subject: `Add ${created.length} task boilerplate${created.length === 1 ? '' : 's'}`, temporaryDirectory: project.runtime.temporary });
        sha = outcome.committed ? outcome.sha : undefined;
    }
    for (const path of created) context.terminal.write(`Created ${toProjectRelative(project.root, path)}\n`);
    context.terminal.write(`${created.length} placeholder file(s); they never run until the @@@ placeholders are written${sha ? ` (committed ${sha.slice(0, 8)})` : commit ? '' : ' (not committed)'}.\n`);
    return EXIT.success;
}
