import { build } from 'esbuild';
import { cp, copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vscodeVersion } from './vscode-version.mjs';

/** All extension outputs are generated from this checkout; no extension version is maintained separately. */
const root = fileURLToPath(new URL('../', import.meta.url));
/** Checked-in editor implementation and assets. */
const source = join(root, 'extensions/vscode');
/** Output directory excluded from both Git and the npm package. */
const output = join(root, 'dist-vscode');
/** Only this generated directory is passed to the VSIX packager. */
const stage = join(output, 'extension');
/** Authoritative engine release metadata. */
const engine = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
/** Source manifest is a template; its version always comes from the engine. */
const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
manifest.version = vscodeVersion(engine.version);
manifest.promptbook = { version: engine.version };
await rm(stage, { recursive: true, force: true });
await mkdir(join(stage, 'syntaxes'), { recursive: true });
for (const path of ['icons', 'snippets', 'README.md', 'language-configuration.json']) await cp(join(source, path), join(stage, path), { recursive: true });
await copyFile(join(root, 'LICENSE.md'), join(stage, 'LICENSE.md'));
await writeFile(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 4)}\n`);
await writeFile(join(stage, 'CHANGELOG.md'), `# Changelog\n\n## ${manifest.version} — ptbk ${engine.version}\n\nBuilt with this Promptbook version. See the [engine changelog](https://github.com/webgptorg/promptbook/tree/v${engine.version}/changelog).\n`);
/** Bundle shared source and runtime libraries; VS Code itself is supplied by the editor. */
const bundled = await build({
    absWorkingDir: root, entryPoints: ['extensions/vscode/src/extension.ts'],
    outfile: join(stage, 'out/extension.cjs'), bundle: true, platform: 'node', target: 'node18', format: 'cjs',
    external: ['vscode'], legalComments: 'external', metafile: true, sourcemap: 'external',
});
/** Include the licenses of every actual bundled third-party package, including transitive runtime dependencies. */
const dependencyDirectories = new Set(Object.keys(bundled.metafile.inputs).filter((path) => path.includes('node_modules/')).map((path) => {
    const marker = path.lastIndexOf('node_modules/') + 'node_modules/'.length;
    const segments = path.slice(marker).split('/');
    return join(root, path.slice(0, marker), ...segments.slice(0, segments[0].startsWith('@') ? 2 : 1));
}));
/** License text shipped with the extension, not with unrelated development tooling. */
const notices = ['# Third-party notices', 'The Book icon is retained from webgptorg/book-extension (Promptbook).'];
for (const directory of [...dependencyDirectories].sort()) {
    const dependency = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    const files = (await readdir(directory)).filter((name) => /^licen[sc]e(?:[.-].*)?$/i.test(name)).sort();
    notices.push(`## ${dependency.name} ${dependency.version} (${dependency.license})`);
    if (files.length) {
        for (const file of files) notices.push(await readFile(join(directory, file), 'utf8'));
    } else {
        // Some small legacy dependencies put their complete license in the README instead of a separate file.
        const readme = (await readdir(directory)).find((name) => /^readme(?:\.md)?$/i.test(name));
        const text = readme ? await readFile(join(directory, readme), 'utf8') : '';
        const license = /(?:^|\n)#{1,6} License[^\n]*\n([\s\S]+)/i.exec(text)?.[1];
        if (!license || !/permission is hereby granted/i.test(license)) throw new Error(`No complete license found for bundled dependency ${dependency.name}.`);
        notices.push(license.trim());
    }
}
await writeFile(join(stage, 'THIRD_PARTY_NOTICES.txt'), `${notices.join('\n\n')}\n`);
await build({
    absWorkingDir: root, entryPoints: ['extensions/vscode/src/language.ts', 'extensions/vscode/src/bookc.ts'],
    outdir: join(output, 'test'), outExtension: { '.js': '.cjs' }, bundle: true, platform: 'node', target: 'node18', format: 'cjs',
});
/** Load the just-built vocabulary, including aliases and newly introduced commitments. */
const { commitmentKeywords } = createRequire(import.meta.url)(join(output, 'test/language.cjs'));
/** TextMate is the startup fallback; semantic highlighting uses the shared engine ranges directly. */
const alternatives = commitmentKeywords().sort((a, b) => b.length - a.length || a.localeCompare(b))
    .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(' ', '[ \\t]+')).join('|');
/** Offline TextMate fallback with generated commitment spellings and embedded Markdown. */
const grammar = {
    name: 'Book', scopeName: 'text.book', patterns: [
        { name: 'markup.raw.block.book', begin: '^\\s{0,3}(`{3,})(.*)$', end: '^\\s{0,3}\\1`*[ \\t]*$' },
        { name: 'markup.raw.block.book', begin: '^\\s{0,3}(~{3,})(.*)$', end: '^\\s{0,3}\\1~*[ \\t]*$' },
        { name: 'string.quoted.literal.book', match: '^\\\\.*$' },
        { name: 'keyword.control.commitment.book', match: `^\\x{FEFF}?(?:${alternatives})(?![ \\t]+\\p{Lu}[\\p{Lu}\\p{M}]*(?=[ \\t]|$))(?=[ \\t]|$)` },
        { name: 'invalid.illegal.unknown-commitment.book', match: '^\\x{FEFF}?(?=(?:[ \\t]*[\\p{Lu}\\p{M}]){3})\\p{Lu}[\\p{Lu}\\p{M}]*(?:[ \\t]+\\p{Lu}[\\p{Lu}\\p{M}]*)*(?=[ \\t]|$)' },
        { name: 'markup.inline.raw.book', begin: '(`+)', end: '\\1' },
        { name: 'variable.other.reference.book', match: '(?<![A-Za-z0-9._%+@-])@[^\\s@{}()\\[\\]<>,;:!?"\'`]+|(?<!\\{)\\{[^{}\\n]+\\}(?!\\})' },
        { include: 'text.html.markdown' },
    ],
};
await writeFile(join(stage, 'syntaxes/book.tmLanguage.json'), `${JSON.stringify(grammar, null, 4)}\n`);
process.stdout.write(`Built Book extension ${manifest.version} for ptbk ${engine.version}.\n`);
