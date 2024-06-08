import colors from 'colors';
import { readFile, writeFile } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { execCommand } from './execCommand/execCommand';
import { prettify } from './prettify';

export async function writeAllProjectFiles(
    files: Array<{ path: string; content: string }>,
    isOrganized: boolean,
): Promise<void> {
    const changedFilesPaths: string[] = [];

    for (const file of files) {
        const oldContent = await promisify(readFile)(file.path, 'utf8');
        if (file.content !== oldContent) {
            console.info(colors.gray(`Writing file ${file.path}`));
            // console.log({ file });

            await promisify(writeFile)(file.path, await prettify(file.content));
            changedFilesPaths.push(file.path);
        }
    }

    if (isOrganized && files.length > 0) {
        await execCommand({
            cwd: join(__dirname, '../../'),
            command: `npx organize-imports-cli ${changedFilesPaths
                .map((path) => path.split('\\').join('/'))
                .join(' ')}`,
        });
    }
}
