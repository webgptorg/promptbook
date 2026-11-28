#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-sys --unstable-sloppy-imports

/**
 * This script itterates over all markdown files in cwd
 * Searches for the `<!-- Import ./path/to/file.md -->`
 * and replaces it with the content of the imported file.
 */

import colors from 'colors';
import { walk } from 'https://deno.land/std/fs/mod.ts';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { placeImports } from './placeImports';

const cwd = process.cwd();

const files = walk(cwd, {
    includeDirs: false,
    exts: ['.md'],
    skip: ['node_modules'],
});

for await (const file of files) {
    if (file.isFile === false) {
        continue;
    }

    if (file.path.endsWith('.book.md')) {
        continue;
    }

    if (file.path.includes('/.') || file.path.includes('\\.')) {
        continue;
    }

    try {
        const content = await readFile(file.path, 'utf-8');
        const newContent = await placeImports(content, async (importPath: string) =>
            readFile(join(dirname(file.path), importPath), 'utf-8'),
        );

        if (content === newContent) {
            console.info(colors.gray(file.path));
        } else {
            await writeFile(file.path, newContent);
            console.info(colors.green(file.path));
        }
    } catch (error) {
        console.error(colors.red(file.path));
        throw error;
    }
}

/**
 * TODO: [🥗][🧠] How to handle table of contents for imported markdowns
 */
