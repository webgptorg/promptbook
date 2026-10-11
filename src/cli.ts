import { readFile } from 'node:fs/promises';
import { main as runCli } from './coder/cli.js';

/** Return the selected installation's package version, independently of project metadata. @private */
export async function installedVersion(): Promise<string> {
    return (JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version;
}

/** Run the installed root command and preserve its documented exit status. @private */
export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
    process.exitCode = await runCli(args);
}
