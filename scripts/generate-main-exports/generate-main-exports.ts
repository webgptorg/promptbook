#!/usr/bin/env ts-node

import { readFile, writeFile } from 'fs';
import glob from 'glob-promise';
import { join, relative } from 'path';
import { promisify } from 'util';

main();

async function main() {
    const comments = [
        '🏭 GENERATED WITH generate-main-exports',
        '⚠ Warning: Do not edit by hand, all changes will be lost on next execution!',
    ];

    const filesPath = await glob(
        join(__dirname, '../../src/**/*.ts').split('\\').join('/'),
    );
    const files = await Promise.all(
        filesPath.map(async (path) => ({
            path,
            content: await promisify(readFile)(path, 'utf8'),
        })),
    );

    const exports: Array<{ path: string; name: string }> = [];
    for (const file of files) {
        let execArray: any; // RegExpExecArray | null;
        const regExp =
            /^export\s+(?!abstract)\s*(async)?\s*[a-z]+\s+(?<name>[a-zA-Z0-9_]+)/gm;
        while ((execArray = regExp.exec(file.content))) {
            const { name, annotationRaw } = execArray.groups!;
            console.log('!!!', { name, annotationRaw });
            exports.push({ path: file.path, name });
        }
    }

    let content = '';

    content += comments.map((comment) => `// ${comment}`).join('\n');
    content += '\n\n';

    content += exports
        .map(
            ({ name, path }) =>
                `import { ${name} } from './${relative(
                    join(__dirname, '../../src'),
                    path,
                )
                    .split('\\')
                    .join('/')
                    .replace(/\.tsx?$/, '')}';`,
        )
        .join('\n');
    content += '\n\n';

    content += `export {\n${exports
        .sort(
            (a, b) =>
                a.name.length > b.name.length
                    ? 1
                    : -1 /* TODO: Maybe some better sorting */,
        )
        .map(({ name }) => name)
        .join(',\n')}\n};`;

    await promisify(writeFile)(join(__dirname, '../../src/index.ts'), content);
}

/**
 * TODO: Pretty and organize imports
 * TODO: !!! Use fs/promises instead of fs
 * TODO: Activate TypeScript 3.8 and use top level await instead of wrapped code by main function
 */
