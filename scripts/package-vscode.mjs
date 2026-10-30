import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createVSIX } from '@vscode/vsce';

/** Package the already generated extension separately from npm's single ptbk package. */
const root = fileURLToPath(new URL('../', import.meta.url));
/** The artifact filename identifies the full original engine version, including its prerelease counter. */
const engine = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
/** Release artifact kept outside npm's publishable file set. */
const packagePath = join(root, 'dist-vscode', `book-extension-ptbk-${engine.version}.vsix`);
await createVSIX({ cwd: join(root, 'dist-vscode/extension'), packagePath, dependencies: false });
/** Hash of the actual downloadable container. */
const digest = createHash('sha256').update(await readFile(packagePath)).digest('hex');
await writeFile(`${packagePath}.sha256`, `${digest}  book-extension-ptbk-${engine.version}.vsix\n`);
process.stdout.write(`${packagePath}\n`);
