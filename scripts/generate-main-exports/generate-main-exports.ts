#!/usr/bin/env ts-node

import { writeFile } from 'fs';
import { join, relative } from 'path';
import { promisify } from 'util';
import { findAllProjectEntities } from '../utils/findAllProjectEntities';

main();

async function main() {
    const comments = [
        '🏭 GENERATED WITH generate-main-exports',
        '⚠ Warning: Do not edit by hand, all changes will be lost on next execution!',
    ];

    const entities = await findAllProjectEntities();
    const publicEntities = entities.filter(
        ({ tags, filePath }) => !tags.includes('@private') && !filePath.includes('_'),
    );

    let content = '';

    content += comments.map((comment) => `// ${comment}`).join('\n');
    content += '\n\n';

    content += publicEntities
        .map(
            ({ name, filePath }) =>
                `import { ${name} } from './${relative(join(__dirname, '../../src'), filePath)
                    .split('\\')
                    .join('/')
                    .replace(/\.tsx?$/, '')}';`,
        )
        .join('\n');
    content += '\n\n';

    content += `export {\n${publicEntities.map(({ name }) => name).join(',\n')}\n};`;

    await promisify(writeFile)(join(__dirname, '../../src/index.ts'), content);
}

/**
 * TODO: Pretty and organize imports
 * TODO: !! Use fs/promises instead of fs
 * TODO: Activate TypeScript 3.8 and use top level await instead of wrapped code by main function
 */
